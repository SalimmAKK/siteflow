import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logActivity } from './activity';

export async function seedMockData(userId: string, userName: string) {
  try {
    // 1. Create Projects (coordinates are real Riyadh-area sites for weather forecasts)
    const projects = [
      { title: 'Al Nakheel Villa Complex', description: '12-unit residential villa compound, structural and MEP phase.', status: 'Active', lat: 24.7550, lng: 46.6300 },
      { title: 'Diriyah Retail Fitout', description: 'Interior fitout and finishing for a 3-unit retail block.', status: 'Active', lat: 24.7370, lng: 46.5750 },
      { title: 'King Fahd Road Overpass', description: 'Road widening and pedestrian overpass construction.', status: 'On Hold', lat: 24.6900, lng: 46.6850 },
      { title: 'Al Malaz Office Tower', description: '8-storey commercial tower, foundation to handover.', status: 'Completed', lat: 24.6600, lng: 46.7300 },
      { title: 'Qurtubah Warehouse Expansion', description: 'Steel frame warehouse extension and loading dock.', status: 'Active', lat: 24.8000, lng: 46.7600 },
    ];

    const projectIds: string[] = [];
    for (const p of projects) {
      const docRef = await addDoc(collection(db, 'projects'), {
        ...p,
        managerId: userId,
        teamMemberIds: [userId],
        createdAt: Timestamp.now(),
        dueDate: Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
      });
      projectIds.push(docRef.id);
      await logActivity('created', 'project', p.title, userId, userName);
    }

    // 2. Create Tasks
    const taskTitles = [
      'Pour foundation slab', 'Install rebar reinforcement', 'Schedule structural inspection',
      'Order steel beams', 'Coordinate crane delivery', 'Install electrical conduit',
      'Fix plumbing leak - Block B', 'Apply exterior render', 'Install site fencing', 'Submit permit renewal',
      'Conduct safety walkthrough', 'Finalize MEP drawings', 'Install HVAC ductwork',
      'Order finishing materials', 'Prepare client handover report'
    ];
    
    const statuses = ['Todo', 'In Progress', 'Completed'];
    const priorities = ['Low', 'Medium', 'High'];

    // Weather-sensitive work: concrete, roofing, exterior finishing.
    const WEATHER_KEYWORDS = ['pour', 'concrete', 'slab', 'screed', 'render', 'exterior', 'facade', 'paint', 'roof', 'asphalt'];

    for (let i = 0; i < 15; i++) {
      const projIndex = i % projectIds.length;
      const status = statuses[i % statuses.length];
      const title = taskTitles[i];
      const isWeatherSensitive = WEATHER_KEYWORDS.some(k => title.toLowerCase().includes(k));
      // Keep weather-sensitive tasks inside the 7-day forecast window so the risk flag is visible.
      const dueOffsetDays = isWeatherSensitive ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 14);
      await addDoc(collection(db, 'tasks'), {
        title: title,
        description: `This is a mock task for ${title}.`,
        status: status,
        priority: priorities[i % priorities.length],
        projectId: projectIds[projIndex],
        projectName: projects[projIndex].title,
        assignedUserId: userId,
        assignedUserName: userName,
        createdAt: Timestamp.now(),
        dueDate: Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * dueOffsetDays),
        isWeatherSensitive,
        checklist: [
          { id: '1', text: 'Site supervisor sign-off', completed: true },
          { id: '2', text: 'Materials on site', completed: false }
        ]
      });
      await logActivity(status === 'Completed' ? 'completed' : 'created', 'task', title, userId, userName);
    }

    // 3. Create Events
    const eventTitles = ['Crew Toolbox Talk', 'Structural Inspection', 'Client Site Walkthrough', 'Weekly Progress Review', 'Safety Audit'];
    const eventLocations = ['Site Office - Block A', 'Al Nakheel Villa Complex', 'Diriyah Retail Site', 'Qurtubah Warehouse', 'Site Office - Block A'];
    for (let i = 0; i < 5; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await addDoc(collection(db, 'events'), {
        title: eventTitles[i],
        location: eventLocations[i],
        date: date,
        timeStart: '10:00',
        timeEnd: '11:00',
        themeId: i % 4,
        userId: userId,
        createdAt: new Date().toISOString()
      });
    }

    console.log('Mock data seeded successfully!');
  } catch (error) {
    console.error('Error seeding mock data:', error);
  }
}
