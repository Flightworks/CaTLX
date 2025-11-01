const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// --- Firebase Initialization ---
// When running on Google Cloud Run, the service account is automatically
// discovered. For local development, you need to set the
// GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your
// service account key file.
// e.g., export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/key.json"
try {
  admin.initializeApp({
    // projectId is automatically inferred from the environment
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  console.error("Firebase Admin SDK initialization error:", error);
  // Exit if Firebase can't be initialized, as it's critical for the app.
  process.exit(1);
}

const db = admin.firestore();
const app = express();

// --- Middleware ---
// Enable CORS for all routes. In a production environment, you would
// want to restrict this to your frontend's domain.
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// --- API Routes ---
app.get('/', (req, res) => {
  res.send('CaTLX Backend API is running!');
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
  // seedDatabase(); // Optional: Uncomment to seed data on startup
});


// --- Seeding Function (for initial setup) ---
// This function adds some initial data to your Firestore database so the
// API has something to return. You can run this once or call it on startup
// during development.
async function seedDatabase() {
    console.log("Checking if seeding is necessary...");
    const studiesRef = db.collection('studies');
    const snapshot = await studiesRef.limit(1).get();

    if (snapshot.empty) {
        console.log("No studies found. Seeding database...");
        const seedStudies = [
          {
            name: 'Artemis II Mission Prep',
            description: 'Preparation tasks for the Artemis II lunar mission.',
            mteIds: ['mte1', 'mte2', 'mte3'],
          },
          {
            name: 'ISS Maintenance Protocols',
            description: 'Evaluating new maintenance protocols aboard the ISS.',
            mteIds: ['mte4', 'mte5'],
          },
        ];

        const batch = db.batch();
        seedStudies.forEach(study => {
            const docRef = studiesRef.doc(); // Automatically generate a document ID
            batch.set(docRef, study);
        });

        await batch.commit();
        console.log("Database seeded successfully with 2 studies.");
    } else {
        console.log("Database already contains data. Skipping seed.");
    }
}
