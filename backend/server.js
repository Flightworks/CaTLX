const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- Firebase Initialization ---
try {
  admin.initializeApp();
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Firebase Admin SDK initialization error:", error);
  process.exit(1);
}

const db = admin.firestore();
const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- API Routes ---
app.get('/', (req, res) => {
  res.send('CaTLX Backend API is running!');
});

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const projectsSnapshot = await db.collection('projects').get();
    const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).send('Error fetching projects');
  }
});

// POST a new project
app.post('/api/projects', async (req, res) => {
    try {
      const newProject = req.body;
      const docRef = await db.collection('projects').add(newProject);
      res.status(201).json({ id: docRef.id, ...newProject });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).send('Error creating project');
    }
  });

// GET all studies
app.get('/api/studies', async (req, res) => {
  try {
    const studiesSnapshot = await db.collection('studies').get();
    const studies = studiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(studies);
  } catch (error) {
    console.error('Error fetching studies:', error);
    res.status(500).send('Error fetching studies');
  }
});

// --- Server Startup ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  seedDatabase(); 
});


// --- Seeding Function ---
async function seedDatabase() {
    console.log("Checking if seeding is necessary...");
    
    // Seed Studies
    const studiesRef = db.collection('studies');
    const studiesSnapshot = await studiesRef.limit(1).get();
    if (studiesSnapshot.empty) {
        console.log("No studies found. Seeding database...");
        const seedStudies = [
          {
            name: 'Artemis II Mission Prep',
            description: 'Preparation tasks for the Artemis II lunar mission.',
            mteIds: ['mte1', 'mte2', 'mte3'],
            projectId: 'default_project'
          },
          {
            name: 'ISS Maintenance Protocols',
            description: 'Evaluating new maintenance protocols aboard the ISS.',
            mteIds: ['mte4', 'mte5'],
            projectId: 'default_project'
          },
        ];
        const batch = db.batch();
        seedStudies.forEach(study => {
            const docRef = studiesRef.doc();
            batch.set(docRef, study);
        });
        await batch.commit();
        console.log("Database seeded successfully with 2 studies.");
    } else {
        console.log("Studies collection already contains data. Skipping seed.");
    }

    // Seed Projects
    const projectsRef = db.collection('projects');
    const projectsSnapshot = await projectsRef.limit(1).get();
    if (projectsSnapshot.empty) {
        console.log("No projects found. Seeding database...");
        const seedProjects = [
            {
                id: 'default_project',
                name: 'Default Project',
                studyIds: [],
                evaluatorIds: []
            }
        ];
        const batch = db.batch();
        seedProjects.forEach(project => {
            const docRef = projectsRef.doc(project.id);
            batch.set(docRef, project);
        });
        await batch.commit();
        console.log("Database seeded successfully with 1 project.");
    } else {
        console.log("Projects collection already contains data. Skipping seed.");
    }
}
