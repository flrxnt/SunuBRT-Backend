import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { WebsocketsGateway } from './websockets.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface BusPositionUpdate {
  busId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp?: Date;
  accuracy?: number;
}

export interface BusStatusUpdate {
  busId: string;
  isActive: boolean;
  passengersCount: number;
  tripId?: number;
  lastStopId?: number;
  nextStopId?: number;
  delayMinutes?: number;
}

export interface TrafficAlert {
  lineId: number;
  busId?: string;
  type: 'CONGESTION' | 'INCIDENT' | 'BREAKDOWN' | 'DELAY' | 'ROUTE_CHANGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  location?: {
    latitude: number;
    longitude: number;
    description: string;
  };
  estimatedDuration?: number; // en minutes
  affectedRoutes?: number[];
  timestamp?: number; // timestamp de création de l'alerte
}

@Injectable()
export class BusTrackingService {
  private readonly logger = new Logger(BusTrackingService.name);
  private lastPositions = new Map<string, BusPositionUpdate>();
  private busAlerts = new Map<string, TrafficAlert[]>();

  constructor(
    private prisma: PrismaService,
    private websocketsGateway: WebsocketsGateway,
  ) {}

  /**
   * Met à jour la position d'un bus et notifie les trackers
   */
  async updateBusPosition(positionUpdate: BusPositionUpdate) {
    const { busId, latitude, longitude, altitude, speed, heading, timestamp } =
      positionUpdate;

    try {
      // Valider les coordonnées GPS
      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error('Invalid GPS coordinates');
      }

      // Vérifier que le bus existe
      const bus = await this.prisma.bus.findUnique({
        where: { id: busId },
        include: { line: true },
      });

      if (!bus) {
        throw new Error(`Bus ${busId} not found`);
      }

      // Calculer la vitesse si pas fournie (basé sur la position précédente)
      let calculatedSpeed = speed;
      if (!speed && this.lastPositions.has(busId)) {
        const lastPos = this.lastPositions.get(busId)!;
        const distance = this.calculateDistance(
          lastPos.latitude,
          lastPos.longitude,
          latitude,
          longitude,
        );
        const timeElapsed =
          (Date.now() - (lastPos.timestamp?.getTime() || Date.now())) / 1000; // en secondes
        if (timeElapsed > 0) {
          calculatedSpeed = (distance / timeElapsed) * 3.6; // km/h
        }
      }

      // Mettre à jour en base de données
      const updatedPosition = await this.prisma.position.upsert({
        where: { busId },
        update: {
          latitude,
          longitude,
          altitude,
          speed: calculatedSpeed,
          heading,
          timestamp: timestamp || new Date(),
        },
        create: {
          busId,
          latitude,
          longitude,
          altitude,
          speed: calculatedSpeed,
          heading,
          timestamp: timestamp || new Date(),
        },
      });

      // Stocker la dernière position en mémoire
      this.lastPositions.set(busId, {
        ...positionUpdate,
        speed: calculatedSpeed,
        timestamp: updatedPosition.timestamp,
      });

      // Émettre via WebSocket aux trackers de ce bus
      this.websocketsGateway.emitBusPositionUpdate(busId, {
        latitude: updatedPosition.latitude,
        longitude: updatedPosition.longitude,
        altitude: updatedPosition.altitude,
        speed: updatedPosition.speed,
        heading: updatedPosition.heading,
        timestamp: updatedPosition.timestamp,
      });

      // Si le bus appartient à une ligne, émettre aussi aux trackers de la ligne
      if (bus.lineId) {
        await this.updateLinePositions(bus.lineId);
      }

      // Détecter des anomalies (vitesse excessive, position aberrante, etc.)
      await this.detectAnomalies(busId, updatedPosition, bus);

      this.logger.debug(
        `Position updated for bus ${busId}: ${latitude}, ${longitude}`,
      );

      return updatedPosition;
    } catch (error) {
      this.logger.error(`Error updating bus position ${busId}:`, error.message);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'un bus (nombre de passagers, état, etc.)
   */
  async updateBusStatus(statusUpdate: BusStatusUpdate) {
    const {
      busId,
      isActive,
      passengersCount,
      tripId,
      lastStopId,
      nextStopId,
      delayMinutes,
    } = statusUpdate;

    try {
      // Mettre à jour le bus en base
      const updatedBus = await this.prisma.bus.update({
        where: { id: busId },
        data: {
          isActive,
          passengersCount,
        },
        include: { line: true },
      });

      // Émettre via WebSocket
      this.websocketsGateway.emitBusStatusUpdate(busId, {
        isActive,
        passengersCount,
        capacity: updatedBus.capacity,
        occupancyRate: Math.round(
          (passengersCount / updatedBus.capacity) * 100,
        ),
        tripId,
        lastStopId,
        nextStopId,
        delayMinutes,
      });

      // Vérifier l'affluence et émettre des alertes si nécessaire
      if (passengersCount >= updatedBus.capacity * 0.9) {
        await this.emitTrafficAlert({
          lineId: updatedBus.lineId!,
          busId,
          type: 'CONGESTION',
          severity: 'HIGH',
          message: `Bus ${updatedBus.busNumber} presque plein (${Math.round((passengersCount / updatedBus.capacity) * 100)}% occupé)`,
        });
      }

      this.logger.debug(
        `Status updated for bus ${busId}: ${passengersCount}/${updatedBus.capacity} passengers`,
      );

      return updatedBus;
    } catch (error) {
      this.logger.error(`Error updating bus status ${busId}:`, error.message);
      throw error;
    }
  }

  /**
   * Met à jour les positions de tous les bus d'une ligne
   */
  async updateLinePositions(lineId: number) {
    try {
      const buses = await this.prisma.bus.findMany({
        where: {
          lineId,
          isActive: true,
        },
        include: { currentPosition: true },
      });

      const busPositions = buses
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
          capacity: bus.capacity,
          occupancyRate: Math.round((bus.passengersCount / bus.capacity) * 100),
        }));

      this.websocketsGateway.emitLinePositionUpdate(lineId, busPositions);

      return busPositions;
    } catch (error) {
      this.logger.error(
        `Error updating line positions ${lineId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Émet une alerte de trafic
   */
  async emitTrafficAlert(alert: TrafficAlert) {
    try {
      const alertId = Date.now().toString();
      const fullAlert = {
        ...alert,
        id: alertId,
        timestamp: Date.now(),
      };

      // Stocker l'alerte
      if (!this.busAlerts.has(alert.busId || `line_${alert.lineId}`)) {
        this.busAlerts.set(alert.busId || `line_${alert.lineId}`, []);
      }
      this.busAlerts
        .get(alert.busId || `line_${alert.lineId}`)!
        .push(fullAlert);

      // Émettre l'alerte
      if (alert.busId) {
        this.websocketsGateway.emitBusAlert(alert.busId, fullAlert);
      } else {
        this.websocketsGateway.emitTrafficUpdate(alert.lineId, fullAlert);
      }

      this.logger.warn(
        `Traffic alert emitted: ${alert.type} - ${alert.message}`,
      );

      return fullAlert;
    } catch (error) {
      this.logger.error('Error emitting traffic alert:', error.message);
      throw error;
    }
  }

  /**
   * Obtient l'historique des positions d'un bus
   */
  async getBusPositionHistory(
    busId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100,
  ) {
    try {
      // Note: Il faudrait un modèle PositionHistory pour stocker l'historique
      // Pour l'instant, on retourne juste la position actuelle
      const currentPosition = await this.prisma.position.findUnique({
        where: { busId },
      });

      return currentPosition ? [currentPosition] : [];
    } catch (error) {
      this.logger.error(
        `Error getting position history for bus ${busId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Calcule les statistiques de tracking en temps réel
   */
  async getTrackingStatistics(lineId?: number) {
    try {
      const where = lineId ? { lineId } : {};

      const [activeBuses, totalBuses, positions] = await Promise.all([
        this.prisma.bus.count({ where: { ...where, isActive: true } }),
        this.prisma.bus.count({ where }),
        this.prisma.position.count({ where: { bus: where } }),
      ]);

      // Statistiques WebSocket
      const wsStats = this.websocketsGateway.getTrackingStatistics();

      return {
        activeBuses,
        totalBuses,
        busesWithPosition: positions,
        coverageRate: Math.round((positions / Math.max(activeBuses, 1)) * 100),
        websocket: wsStats,
        lastUpdate: new Date(),
      };
    } catch (error) {
      this.logger.error('Error getting tracking statistics:', error.message);
      throw error;
    }
  }

  /**
   * Nettoyage automatique des anciennes positions et alertes
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Nettoyer les positions en mémoire
      this.lastPositions.forEach((position, busId) => {
        if (position.timestamp && position.timestamp < twentyFourHoursAgo) {
          this.lastPositions.delete(busId);
        }
      });

      // Nettoyer les alertes expirées
      this.busAlerts.forEach((alerts, key) => {
        const validAlerts = alerts.filter((alert) => {
          const alertTime = new Date(alert.timestamp || Date.now());
          return alertTime > twentyFourHoursAgo;
        });

        if (validAlerts.length === 0) {
          this.busAlerts.delete(key);
        } else {
          this.busAlerts.set(key, validAlerts);
        }
      });

      this.logger.debug('Cleanup completed for old tracking data');
    } catch (error) {
      this.logger.error('Error during cleanup:', error.message);
    }
  }

  /**
   * Détecte des anomalies dans les positions et statuts des bus
   */
  private async detectAnomalies(busId: string, position: any, bus: any) {
    try {
      const alerts: TrafficAlert[] = [];

      // Vitesse excessive (plus de 80 km/h en ville)
      if (position.speed && position.speed > 80) {
        alerts.push({
          lineId: bus.lineId!,
          busId,
          type: 'INCIDENT',
          severity: 'HIGH',
          message: `Vitesse excessive détectée: ${Math.round(position.speed)} km/h`,
          location: {
            latitude: position.latitude,
            longitude: position.longitude,
            description: `Position du bus ${bus.busNumber}`,
          },
        });
      }

      // Bus immobile depuis longtemps (plus de 10 minutes sans mouvement)
      const lastPos = this.lastPositions.get(busId);
      if (lastPos && position.speed !== undefined && position.speed < 1) {
        const timeSinceLastMove =
          Date.now() - (lastPos.timestamp?.getTime() || Date.now());
        if (timeSinceLastMove > 10 * 60 * 1000) {
          // 10 minutes
          alerts.push({
            lineId: bus.lineId!,
            busId,
            type: 'BREAKDOWN',
            severity: 'MEDIUM',
            message: `Bus immobile depuis plus de 10 minutes`,
            location: {
              latitude: position.latitude,
              longitude: position.longitude,
              description: `Position du bus ${bus.busNumber}`,
            },
          });
        }
      }

      // Émettre toutes les alertes détectées
      for (const alert of alerts) {
        await this.emitTrafficAlert(alert);
      }
    } catch (error) {
      this.logger.error(
        `Error detecting anomalies for bus ${busId}:`,
        error.message,
      );
    }
  }

  /**
   * Calcule la distance entre deux points GPS (formule de Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance en km
    return distance * 1000; // Retourner en mètres
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Obtient les alertes actives pour un bus ou une ligne
   */
  getActiveAlerts(busId?: string, lineId?: number): TrafficAlert[] {
    const key = busId || `line_${lineId}`;
    return this.busAlerts.get(key) || [];
  }

  /**
   * Force le rafraîchissement des positions de tous les bus actifs
   */
  async refreshAllBusPositions() {
    try {
      const lines = await this.prisma.line.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const line of lines) {
        await this.updateLinePositions(line.id);
      }

      this.logger.log('Refreshed positions for all active bus lines');
    } catch (error) {
      this.logger.error('Error refreshing all bus positions:', error.message);
    }
  }
}
