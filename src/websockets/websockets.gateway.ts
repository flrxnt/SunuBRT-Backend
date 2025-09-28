import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  trackedBuses?: Set<string>; // Bus IDs being tracked
  trackedLines?: Set<number>; // Line IDs being tracked
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: '/notifications',
})
export class WebsocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketsGateway.name);
  private connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private busTrackers = new Map<string, Set<string>>(); // busId -> Set of socketIds tracking this bus
  private lineTrackers = new Map<number, Set<string>>(); // lineId -> Set of socketIds tracking this line

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extraire le token JWT du handshake
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `Connection rejected - No token provided: ${client.id}`,
        );
        client.disconnect();
        return;
      }

      // Vérifier et décoder le token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      // Récupérer les informations utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, firstName: true, lastName: true },
      });

      if (!user) {
        this.logger.warn(`Connection rejected - User not found: ${userId}`);
        client.disconnect();
        return;
      }

      // Associer l'utilisateur au socket
      client.userId = userId;
      client.userRole = user.role;
      client.trackedBuses = new Set();
      client.trackedLines = new Set();

      // Ajouter à la liste des utilisateurs connectés
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // Joindre des salles basées sur le rôle
      await client.join(`user:${userId}`);
      await client.join(`role:${user.role.toLowerCase()}`);

      this.logger.log(
        `User connected: ${user.firstName} ${user.lastName} (${user.role}) - Socket: ${client.id}`,
      );

      // Envoyer confirmation de connexion
      client.emit('connection:established', {
        userId: user.id,
        role: user.role,
        timestamp: new Date().toISOString(),
      });

      // Envoyer les notifications en attente
      await this.sendPendingNotifications(userId, client);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      // Nettoyer les trackings de bus
      if (client.trackedBuses) {
        client.trackedBuses.forEach((busId) => {
          const trackers = this.busTrackers.get(busId);
          if (trackers) {
            trackers.delete(client.id);
            if (trackers.size === 0) {
              this.busTrackers.delete(busId);
            }
          }
          client.leave(`bus:${busId}`);
        });
      }

      // Nettoyer les trackings de lignes
      if (client.trackedLines) {
        client.trackedLines.forEach((lineId) => {
          const trackers = this.lineTrackers.get(lineId);
          if (trackers) {
            trackers.delete(client.id);
            if (trackers.size === 0) {
              this.lineTrackers.delete(lineId);
            }
          }
          client.leave(`line:${lineId}`);
        });
      }

      // Nettoyer la liste des utilisateurs connectés
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
      this.logger.log(`User disconnected: ${userId} - Socket: ${client.id}`);
    }
  }

  // ===============================
  // MÉTHODES PUBLIQUES POUR ÉMETTRE
  // ===============================

  /**
   * Émet un événement à un utilisateur spécifique
   */
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Émet un événement à tous les utilisateurs d'un rôle
   */
  emitToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role.toLowerCase()}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Émet un événement à tous les utilisateurs connectés
   */
  emitToAll(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // ===============================
  // ÉVÉNEMENTS SPÉCIFIQUES MÉTIER
  // ===============================

  /**
   * Notification d'achat de ticket
   */
  emitTicketPurchased(userId: string, ticketData: any) {
    this.emitToUser(userId, 'ticket:created', {
      type: 'TICKET_PURCHASED',
      message: 'Votre ticket a été créé avec succès',
      ticket: ticketData,
    });
  }

  /**
   * Notification de paiement
   */
  emitPaymentUpdate(userId: string, paymentData: any) {
    const message =
      paymentData.status === 'COMPLETED'
        ? 'Votre paiement a été confirmé'
        : 'Votre paiement a échoué';

    this.emitToUser(userId, 'payment:updated', {
      type: 'PAYMENT_UPDATE',
      message,
      payment: paymentData,
    });
  }

  /**
   * Notification de validation de ticket
   */
  emitTicketValidated(userId: string, validationData: any) {
    this.emitToUser(userId, 'ticket:validated', {
      type: 'TICKET_VALIDATED',
      message: 'Votre ticket a été validé',
      validation: validationData,
    });
  }

  /**
   * Notification de nouveau voyage (pour les conducteurs)
   */
  emitTripAssignment(driverId: string, tripData: any) {
    this.emitToUser(driverId, 'trip:assigned', {
      type: 'TRIP_ASSIGNED',
      message: 'Nouveau voyage assigné',
      trip: tripData,
    });
  }

  /**
   * Notification d'urgence système
   */
  emitSystemAlert(alertData: any) {
    this.emitToRole('ADMIN', 'system:alert', {
      type: 'SYSTEM_ALERT',
      level: alertData.level || 'info',
      message: alertData.message,
      data: alertData,
    });
  }

  // ===============================
  // GESTIONNAIRES D'ÉVÉNEMENTS CLIENT
  // ===============================

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      userId: client.userId,
    });
  }

  @SubscribeMessage('subscribe:notifications')
  handleSubscribeNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { types: string[] },
  ) {
    const { types } = data;

    // Joindre des salles spécifiques aux types de notifications
    types.forEach((type) => {
      client.join(`notification:${type}`);
    });

    client.emit('subscription:confirmed', {
      types,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('unsubscribe:notifications')
  handleUnsubscribeNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { types: string[] },
  ) {
    const { types } = data;

    // Quitter les salles spécifiques
    types.forEach((type) => {
      client.leave(`notification:${type}`);
    });

    client.emit('unsubscription:confirmed', {
      types,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('get:connection:info')
  handleGetConnectionInfo(@ConnectedSocket() client: AuthenticatedSocket) {
    const userSockets = this.connectedUsers.get(client.userId!) || new Set();

    client.emit('connection:info', {
      userId: client.userId,
      role: client.userRole,
      connectedSockets: userSockets.size,
      rooms: Array.from(client.rooms),
      trackedBuses: Array.from(client.trackedBuses || []),
      trackedLines: Array.from(client.trackedLines || []),
      timestamp: new Date().toISOString(),
    });
  }

  // ===============================
  // GESTIONNAIRES DE TRACKING BUS
  // ===============================

  @SubscribeMessage('track:bus')
  async handleTrackBus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { busId: string },
  ) {
    const { busId } = data;
    const userId = client.userId;

    if (!userId) {
      client.emit('error', { message: 'Utilisateur non authentifié' });
      return;
    }

    try {
      // Vérifier que le bus existe
      const bus = await this.prisma.bus.findUnique({
        where: { id: busId },
        include: {
          line: true,
          currentPosition: true,
        },
      });

      if (!bus) {
        client.emit('error', { message: 'Bus non trouvé' });
        return;
      }

      // Ajouter le client aux trackers de ce bus
      if (!this.busTrackers.has(busId)) {
        this.busTrackers.set(busId, new Set());
      }
      this.busTrackers.get(busId)!.add(client.id);
      client.trackedBuses!.add(busId);

      // Joindre la salle du bus
      await client.join(`bus:${busId}`);

      this.logger.log(
        `User ${userId} started tracking bus ${busId} (${bus.busNumber})`,
      );

      // Envoyer la position actuelle si disponible
      if (bus.currentPosition) {
        client.emit('bus:position', {
          busId,
          busNumber: bus.busNumber,
          lineId: bus.lineId,
          lineName: bus.line?.name,
          position: {
            latitude: bus.currentPosition.latitude,
            longitude: bus.currentPosition.longitude,
            speed: bus.currentPosition.speed,
            heading: bus.currentPosition.heading,
            altitude: bus.currentPosition.altitude,
            timestamp: bus.currentPosition.timestamp,
          },
          passengers: bus.passengersCount,
          isActive: bus.isActive,
        });
      }

      client.emit('track:bus:success', {
        busId,
        busNumber: bus.busNumber,
        message: `Suivi du bus ${bus.busNumber} activé`,
      });
    } catch (error) {
      this.logger.error(`Error tracking bus ${busId}:`, error.message);
      client.emit('error', { message: 'Erreur lors du suivi du bus' });
    }
  }

  @SubscribeMessage('untrack:bus')
  async handleUntrackBus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { busId: string },
  ) {
    const { busId } = data;
    const userId = client.userId;

    if (!userId) return;

    // Retirer le client des trackers de ce bus
    const trackers = this.busTrackers.get(busId);
    if (trackers) {
      trackers.delete(client.id);
      if (trackers.size === 0) {
        this.busTrackers.delete(busId);
      }
    }

    client.trackedBuses?.delete(busId);
    await client.leave(`bus:${busId}`);

    this.logger.log(`User ${userId} stopped tracking bus ${busId}`);

    client.emit('untrack:bus:success', {
      busId,
      message: `Suivi du bus arrêté`,
    });
  }

  @SubscribeMessage('track:line')
  async handleTrackLine(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { lineId: number },
  ) {
    const { lineId } = data;
    const userId = client.userId;

    if (!userId) {
      client.emit('error', { message: 'Utilisateur non authentifié' });
      return;
    }

    try {
      // Vérifier que la ligne existe
      const line = await this.prisma.line.findUnique({
        where: { id: lineId },
        include: {
          buses: {
            where: { isActive: true },
            include: {
              currentPosition: true,
            },
          },
        },
      });

      if (!line) {
        client.emit('error', { message: 'Ligne non trouvée' });
        return;
      }

      // Ajouter le client aux trackers de cette ligne
      if (!this.lineTrackers.has(lineId)) {
        this.lineTrackers.set(lineId, new Set());
      }
      this.lineTrackers.get(lineId)!.add(client.id);
      client.trackedLines!.add(lineId);

      // Joindre la salle de la ligne
      await client.join(`line:${lineId}`);

      this.logger.log(
        `User ${userId} started tracking line ${lineId} (${line.name})`,
      );

      // Envoyer les positions actuelles de tous les bus de la ligne
      const busPositions = line.buses
        .filter((bus) => bus.currentPosition)
        .map((bus) => ({
          busId: bus.id,
          busNumber: bus.busNumber,
          position: {
            latitude: bus.currentPosition!.latitude,
            longitude: bus.currentPosition!.longitude,
            speed: bus.currentPosition!.speed,
            heading: bus.currentPosition!.heading,
            altitude: bus.currentPosition!.altitude,
            timestamp: bus.currentPosition!.timestamp,
          },
          passengers: bus.passengersCount,
          isActive: bus.isActive,
        }));

      client.emit('line:buses:positions', {
        lineId,
        lineName: line.name,
        lineNumber: line.number,
        buses: busPositions,
        totalBuses: line.buses.length,
      });

      client.emit('track:line:success', {
        lineId,
        lineName: line.name,
        activeBuses: line.buses.length,
        message: `Suivi de la ligne ${line.name} activé`,
      });
    } catch (error) {
      this.logger.error(`Error tracking line ${lineId}:`, error.message);
      client.emit('error', { message: 'Erreur lors du suivi de la ligne' });
    }
  }

  @SubscribeMessage('untrack:line')
  async handleUntrackLine(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { lineId: number },
  ) {
    const { lineId } = data;
    const userId = client.userId;

    if (!userId) return;

    // Retirer le client des trackers de cette ligne
    const trackers = this.lineTrackers.get(lineId);
    if (trackers) {
      trackers.delete(client.id);
      if (trackers.size === 0) {
        this.lineTrackers.delete(lineId);
      }
    }

    client.trackedLines?.delete(lineId);
    await client.leave(`line:${lineId}`);

    this.logger.log(`User ${userId} stopped tracking line ${lineId}`);

    client.emit('untrack:line:success', {
      lineId,
      message: `Suivi de la ligne arrêté`,
    });
  }

  @SubscribeMessage('get:tracked:buses')
  handleGetTrackedBuses(@ConnectedSocket() client: AuthenticatedSocket) {
    const trackedBuses = Array.from(client.trackedBuses || []);
    const trackedLines = Array.from(client.trackedLines || []);

    client.emit('tracked:buses:list', {
      trackedBuses,
      trackedLines,
      timestamp: new Date().toISOString(),
    });
  }

  // ===============================
  // MÉTHODES PRIVÉES
  // ===============================

  private async sendPendingNotifications(
    userId: string,
    client: AuthenticatedSocket,
  ) {
    try {
      // Récupérer les notifications non lues pour cet utilisateur
      // Cette fonctionnalité peut être étendue avec un modèle Notification

      // Pour l'instant, on peut vérifier s'il y a des tickets/paiements en attente
      const pendingTickets = await this.prisma.ticket.count({
        where: {
          userId,
          status: 'PENDING',
        },
      });

      const pendingPayments = await this.prisma.payment.count({
        where: {
          userId,
          status: 'PENDING',
        },
      });

      if (pendingTickets > 0) {
        client.emit('pending:tickets', {
          type: 'PENDING_TICKETS',
          message: `Vous avez ${pendingTickets} ticket(s) en attente de paiement`,
          count: pendingTickets,
        });
      }

      if (pendingPayments > 0) {
        client.emit('pending:payments', {
          type: 'PENDING_PAYMENTS',
          message: `Vous avez ${pendingPayments} paiement(s) en cours`,
          count: pendingPayments,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error sending pending notifications: ${error.message}`,
      );
    }
  }

  // ===============================
  // MÉTHODES UTILITAIRES
  // ===============================

  /**
   * Obtient le nombre d'utilisateurs connectés
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Vérifie si un utilisateur est connecté
   */
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Obtient la liste des utilisateurs connectés par rôle
   */
  getConnectedUsersByRole(role: string): string[] {
    const users: string[] = [];
    this.connectedUsers.forEach((sockets, userId) => {
      // Note: Il faudrait stocker le rôle pour chaque utilisateur connecté
      // pour une implémentation plus efficace
      users.push(userId);
    });
    return users;
  }

  /**
   * Déconnecte tous les sockets d'un utilisateur
   */
  disconnectUser(userId: string, reason?: string) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force:disconnect', {
            reason: reason || 'Déconnexion forcée par le système',
            timestamp: new Date().toISOString(),
          });
          socket.disconnect();
        }
      });
      this.connectedUsers.delete(userId);
    }
  }

  // ===============================
  // MÉTHODES DE TRACKING BUS
  // ===============================

  /**
   * Émet une mise à jour de position de bus à tous les trackers
   */
  emitBusPositionUpdate(busId: string, positionData: any) {
    this.server.to(`bus:${busId}`).emit('bus:position:update', {
      busId,
      position: positionData,
      timestamp: new Date().toISOString(),
    });

    // Aussi émettre aux trackers de ligne si le bus appartient à une ligne
    // On peut améliorer cela en récupérant la ligne du bus
    this.logger.debug(`Bus position updated: ${busId}`);
  }

  /**
   * Émet une mise à jour de position pour tous les bus d'une ligne
   */
  emitLinePositionUpdate(lineId: number, busPositions: any[]) {
    this.server.to(`line:${lineId}`).emit('line:positions:update', {
      lineId,
      buses: busPositions,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Émet un événement quand un bus démarre ou termine son service
   */
  emitBusStatusUpdate(busId: string, statusData: any) {
    this.server.to(`bus:${busId}`).emit('bus:status:update', {
      busId,
      status: statusData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Émet une notification d'urgence pour un bus spécifique
   */
  emitBusAlert(busId: string, alertData: any) {
    // Envoyer aux trackers du bus
    this.server.to(`bus:${busId}`).emit('bus:alert', {
      busId,
      alert: alertData,
      timestamp: new Date().toISOString(),
    });

    // Envoyer aussi aux administrateurs
    this.emitToRole('ADMIN', 'bus:alert', {
      busId,
      alert: alertData,
    });
  }

  /**
   * Émet des informations sur le trafic/affluence
   */
  emitTrafficUpdate(lineId: number, trafficData: any) {
    this.server.to(`line:${lineId}`).emit('line:traffic:update', {
      lineId,
      traffic: trafficData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Obtient les statistiques de tracking
   */
  getTrackingStatistics() {
    return {
      totalConnectedUsers: this.connectedUsers.size,
      trackedBuses: this.busTrackers.size,
      trackedLines: this.lineTrackers.size,
      totalBusTrackers: Array.from(this.busTrackers.values()).reduce(
        (total, trackers) => total + trackers.size,
        0,
      ),
      totalLineTrackers: Array.from(this.lineTrackers.values()).reduce(
        (total, trackers) => total + trackers.size,
        0,
      ),
    };
  }

  /**
   * Obtient la liste des bus les plus suivis
   */
  getMostTrackedBuses(limit: number = 10) {
    return Array.from(this.busTrackers.entries())
      .map(([busId, trackers]) => ({
        busId,
        trackersCount: trackers.size,
      }))
      .sort((a, b) => b.trackersCount - a.trackersCount)
      .slice(0, limit);
  }

  /**
   * Obtient la liste des lignes les plus suivies
   */
  getMostTrackedLines(limit: number = 10) {
    return Array.from(this.lineTrackers.entries())
      .map(([lineId, trackers]) => ({
        lineId,
        trackersCount: trackers.size,
      }))
      .sort((a, b) => b.trackersCount - a.trackersCount)
      .slice(0, limit);
  }
}
