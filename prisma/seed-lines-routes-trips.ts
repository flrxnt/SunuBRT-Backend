import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Lines, Routes & Trips...');

  // Supprimer les données existantes dans l'ordre inverse des relations
  await prisma.ticket.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.routePoint.deleteMany();
  await prisma.route.deleteMany();
  await prisma.line.deleteMany();

  console.log('🧹 Existing data cleaned');

  // Créer les lignes
  const ligne1 = await prisma.line.create({
    data: {
      name: 'Ligne 1',
      number: '1',
      color: '#FF5722',
      description: 'Ligne principale reliant Dakar Centre à Guédiawaye',
      isActive: true,
    },
  });

  const ligneA = await prisma.line.create({
    data: {
      name: 'Ligne A',
      number: 'A',
      color: '#2196F3',
      description: 'Ligne express Dakar-Pikine',
      isActive: true,
    },
  });

  const ligneBRT = await prisma.line.create({
    data: {
      name: 'Ligne BRT',
      number: 'BRT1',
      color: '#4CAF50',
      description: 'Bus Rapid Transit - Ligne principale',
      isActive: true,
    },
  });

  console.log('✅ Lines created');

  // Créer les routes pour la Ligne 1
  const routeDakarGuedie = await prisma.route.create({
    data: {
      name: 'Dakar Centre - Guédiawaye',
      description: 'Route aller de Dakar Centre vers Guédiawaye',
      lineId: ligne1.id,
      isActive: true,
      points: {
        create: [
          {
            latitude: 14.6928,
            longitude: -17.4467,
            seq: 1,
            name: 'Place de l\'Indépendance',
          },
          {
            latitude: 14.6937,
            longitude: -17.4441,
            seq: 2,
            name: 'Plateau',
          },
          {
            latitude: 14.7167,
            longitude: -17.4677,
            seq: 3,
            name: 'Médina',
          },
          {
            latitude: 14.7500,
            longitude: -17.4500,
            seq: 4,
            name: 'Grand Yoff',
          },
          {
            latitude: 14.7833,
            longitude: -17.4167,
            seq: 5,
            name: 'Guédiawaye Terminal',
          },
        ],
      },
    },
  });

  const routeGuedieDakar = await prisma.route.create({
    data: {
      name: 'Guédiawaye - Dakar Centre',
      description: 'Route retour de Guédiawaye vers Dakar Centre',
      lineId: ligne1.id,
      isActive: true,
      points: {
        create: [
          {
            latitude: 14.7833,
            longitude: -17.4167,
            seq: 1,
            name: 'Guédiawaye Terminal',
          },
          {
            latitude: 14.7500,
            longitude: -17.4500,
            seq: 2,
            name: 'Grand Yoff',
          },
          {
            latitude: 14.7167,
            longitude: -17.4677,
            seq: 3,
            name: 'Médina',
          },
          {
            latitude: 14.6937,
            longitude: -17.4441,
            seq: 4,
            name: 'Plateau',
          },
          {
            latitude: 14.6928,
            longitude: -17.4467,
            seq: 5,
            name: 'Place de l\'Indépendance',
          },
        ],
      },
    },
  });

  // Créer les routes pour la Ligne A
  const routeDakarPikine = await prisma.route.create({
    data: {
      name: 'Dakar - Pikine Express',
      description: 'Route express vers Pikine',
      lineId: ligneA.id,
      isActive: true,
      points: {
        create: [
          {
            latitude: 14.6928,
            longitude: -17.4467,
            seq: 1,
            name: 'Dakar Centre',
          },
          {
            latitude: 14.7284,
            longitude: -17.4108,
            seq: 2,
            name: 'Parcelles Assainies',
          },
          {
            latitude: 14.7642,
            longitude: -17.3736,
            seq: 3,
            name: 'Pikine Terminal',
          },
        ],
      },
    },
  });

  // Créer une route BRT
  const routeBRT = await prisma.route.create({
    data: {
      name: 'Corridor BRT Principal',
      description: 'Route principale du Bus Rapid Transit',
      lineId: ligneBRT.id,
      isActive: true,
      points: {
        create: [
          {
            latitude: 14.6737,
            longitude: -17.4567,
            seq: 1,
            name: 'Terminal Petersen',
          },
          {
            latitude: 14.6928,
            longitude: -17.4467,
            seq: 2,
            name: 'Place de l\'Indépendance',
          },
          {
            latitude: 14.7037,
            longitude: -17.4341,
            seq: 3,
            name: 'Colobane',
          },
          {
            latitude: 14.7500,
            longitude: -17.4000,
            seq: 4,
            name: 'Hann Marché',
          },
          {
            latitude: 14.7833,
            longitude: -17.3667,
            seq: 5,
            name: 'Thiaroye',
          },
        ],
      },
    },
  });

  console.log('✅ Routes created');

  // Calculer et mettre à jour la distance et la durée pour chaque route
  const routes = [routeDakarGuedie, routeGuedieDakar, routeDakarPikine, routeBRT];

  for (const route of routes) {
    const points = await prisma.routePoint.findMany({
      where: { routeId: route.id },
      orderBy: { seq: 'asc' },
    });

    // Calcul simple de distance (formule de Haversine simplifiée)
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const lat1 = points[i].latitude;
      const lon1 = points[i].longitude;
      const lat2 = points[i + 1].latitude;
      const lon2 = points[i + 1].longitude;

      const R = 6371; // Rayon de la Terre en km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      totalDistance += distance;
    }

    // Durée estimée à 25 km/h en moyenne
    const estimatedDuration = Math.ceil((totalDistance / 25) * 60);

    await prisma.route.update({
      where: { id: route.id },
      data: {
        distance: Math.round(totalDistance * 100) / 100,
        duration: estimatedDuration,
        startPointId: points[0].id,
        endPointId: points[points.length - 1].id,
      },
    });
  }

  console.log('✅ Routes updated with distances and durations');

  // Créer des utilisateurs conducteurs de test si ils n'existent pas
  let driver1, driver2, driver3;

  try {
    driver1 = await prisma.user.create({
      data: {
        email: 'driver1@sunubrt.com',
        password: '$2b$12$LQv3c1yqBCFcXsJszKcS.e0YFaKu.K.K.K.K.K.K.K.K.K.K.K.K.K', // password123
        firstName: 'Mamadou',
        lastName: 'Diallo',
        phone: '+221701234567',
        role: 'DRIVER',
        isVerified: true,
      },
    });
  } catch (error) {
    // L'utilisateur existe peut-être déjà
    driver1 = await prisma.user.findUnique({
      where: { email: 'driver1@sunubrt.com' },
    });
  }

  try {
    driver2 = await prisma.user.create({
      data: {
        email: 'driver2@sunubrt.com',
        password: '$2b$12$LQv3c1yqBCFcXsJszKcS.e0YFaKu.K.K.K.K.K.K.K.K.K.K.K.K.K', // password123
        firstName: 'Fatou',
        lastName: 'Ndiaye',
        phone: '+221701234568',
        role: 'DRIVER',
        isVerified: true,
      },
    });
  } catch (error) {
    driver2 = await prisma.user.findUnique({
      where: { email: 'driver2@sunubrt.com' },
    });
  }

  try {
    driver3 = await prisma.user.create({
      data: {
        email: 'driver3@sunubrt.com',
        password: '$2b$12$LQv3c1yqBCFcXsJszKcS.e0YFaKu.K.K.K.K.K.K.K.K.K.K.K.K.K', // password123
        firstName: 'Ousmane',
        lastName: 'Fall',
        phone: '+221701234569',
        role: 'DRIVER',
        isVerified: true,
      },
    });
  } catch (error) {
    driver3 = await prisma.user.findUnique({
      where: { email: 'driver3@sunubrt.com' },
    });
  }

  // Créer des bus de test
  let bus1, bus2, bus3, bus4, bus5;

  try {
    bus1 = await prisma.bus.create({
      data: {
        busNumber: 'L1-001',
        licensePlate: 'DK-001-SB',
        capacity: 50,
        model: 'Mercedes Citaro',
        year: 2020,
        lineId: ligne1.id,
        driverId: driver1!.id,
        isActive: true,
      },
    });
  } catch (error) {
    // Bus existe peut-être déjà
    console.log('Bus L1-001 might already exist');
  }

  try {
    bus2 = await prisma.bus.create({
      data: {
        busNumber: 'L1-002',
        licensePlate: 'DK-002-SB',
        capacity: 45,
        model: 'Volvo 7900',
        year: 2021,
        lineId: ligne1.id,
        driverId: driver2!.id,
        isActive: true,
      },
    });
  } catch (error) {
    console.log('Bus L1-002 might already exist');
  }

  try {
    bus3 = await prisma.bus.create({
      data: {
        busNumber: 'LA-001',
        licensePlate: 'DK-003-SB',
        capacity: 40,
        model: 'Iveco Urbanway',
        year: 2022,
        lineId: ligneA.id,
        driverId: driver3!.id,
        isActive: true,
      },
    });
  } catch (error) {
    console.log('Bus LA-001 might already exist');
  }

  // Récupérer les bus créés ou existants
  const buses = await prisma.bus.findMany({
    where: {
      busNumber: { in: ['L1-001', 'L1-002', 'LA-001'] },
    },
  });

  console.log('✅ Buses created/found');

  // Créer des voyages de test pour aujourd'hui et demain
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (buses.length > 0) {
    // Voyages pour la route Dakar-Guédiawaye
    await prisma.trip.create({
      data: {
        routeId: routeDakarGuedie.id,
        busId: buses[0].id,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        price: 500,
        availableSeats: 50,
        status: 'SCHEDULED',
      },
    });

    await prisma.trip.create({
      data: {
        routeId: routeDakarGuedie.id,
        busId: buses[0].id,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30),
        price: 500,
        availableSeats: 50,
        status: 'SCHEDULED',
      },
    });

    // Voyages pour la route retour
    await prisma.trip.create({
      data: {
        routeId: routeGuedieDakar.id,
        busId: buses[1].id,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30),
        price: 500,
        availableSeats: 45,
        status: 'IN_PROGRESS',
      },
    });

    // Voyages express pour demain
    await prisma.trip.create({
      data: {
        routeId: routeDakarPikine.id,
        busId: buses[2].id,
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 7, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 8, 0),
        price: 750,
        availableSeats: 40,
        status: 'SCHEDULED',
      },
    });

    await prisma.trip.create({
      data: {
        routeId: routeDakarPikine.id,
        busId: buses[2].id,
        startTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 0),
        endTime: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 13, 0),
        price: 750,
        availableSeats: 40,
        status: 'SCHEDULED',
      },
    });

    // Voyage terminé (pour les statistiques)
    await prisma.trip.create({
      data: {
        routeId: routeBRT.id,
        busId: buses[0].id,
        startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 14, 0),
        endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 15, 45),
        price: 600,
        availableSeats: 50,
        status: 'COMPLETED',
      },
    });

    console.log('✅ Trips created');
  }

  // Créer quelques positions pour les bus actifs
  for (const bus of buses.slice(0, 2)) {
    await prisma.position.upsert({
      where: { busId: bus.id },
      update: {
        latitude: 14.6937 + (Math.random() - 0.5) * 0.01,
        longitude: -17.4441 + (Math.random() - 0.5) * 0.01,
        speed: Math.random() * 60,
        heading: Math.random() * 360,
        timestamp: new Date(),
      },
      create: {
        busId: bus.id,
        latitude: 14.6937 + (Math.random() - 0.5) * 0.01,
        longitude: -17.4441 + (Math.random() - 0.5) * 0.01,
        speed: Math.random() * 60,
        heading: Math.random() * 360,
        timestamp: new Date(),
      },
    });
  }

  console.log('✅ Bus positions created');

  // Résumé des données créées
  const linesCount = await prisma.line.count();
  const routesCount = await prisma.route.count();
  const tripsCount = await prisma.trip.count();
  const pointsCount = await prisma.routePoint.count();

  console.log('\n📊 Seed completed successfully!');
  console.log(`📍 Lines created: ${linesCount}`);
  console.log(`🛣️  Routes created: ${routesCount}`);
  console.log(`🚌 Trips created: ${tripsCount}`);
  console.log(`📍 Route points created: ${pointsCount}`);
  console.log('\n🎯 Test data ready for:');
  console.log('- Lines management');
  console.log('- Routes with GPS coordinates');
  console.log('- Trips scheduling');
  console.log('- Real-time bus tracking');
  console.log('\n💡 Use the test-endpoints.js script to test all functionalities!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
