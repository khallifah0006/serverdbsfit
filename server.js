import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const PYTHON_API = "https://dbsfitml-production.up.railway.app/";

// In-memory storage with improved structure
const workoutStorage = {
  items: [],
  
  // Method to add a new workout
  add(workoutData) {
    const id = Date.now().toString();
    const savedWorkout = {
      id,
      timestamp: new Date(),
      ...workoutData
    };
    
    this.items.push(savedWorkout);
    return savedWorkout;
  },
  
  // Method to check duplicates with configurable criteria
  exists(workout, criteria = ['age', 'gender', 'height', 'weight', 'bmi']) {
    return this.items.some(item => {
      return criteria.every(key => item[key] === workout[key]);
    });
  },
  
  // Find workout by ID
  findById(id) {
    return this.items.find(item => item.id === id);
  },
  
  // Get all workouts 
  getAll() {
    return this.items;
  }
};

// CORS configuration for Netlify frontend
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://your-netlify-app.netlify.app', // Replace with your actual Netlify URL
    /\.netlify\.app$/ // This allows any Netlify subdomain
  ],
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Workout Recommendation API Server is running",
    version: "1.0.0"
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString()
  });
});

// Proxy untuk /api/recommend
app.post("/api/recommend", async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error calling Python API:", error);
    res.status(500).json({ 
      success: false,
      error: "Gagal mengambil rekomendasi dari API Python" 
    });
  }
});

// New and improved endpoint to save workout data
app.post("/api/save", (req, res) => {
  try {
    const workoutData = req.body;
    
    // Validate required fields
    const requiredFields = ['age', 'gender', 'height', 'weight', 'bmi'];
    const missingFields = requiredFields.filter(field => !workoutData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Data tidak lengkap. Field berikut diperlukan: ${missingFields.join(', ')}`
      });
    }
    
    // Check duplicate with custom error messages
    if (workoutStorage.exists(workoutData)) {
      return res.status(409).json({
        success: false,
        error: "Data latihan dengan karakteristik yang sama sudah tersimpan"
      });
    }
    
    // Save to our improved storage system
    const savedWorkout = workoutStorage.add(workoutData);
    
    // Return success with the saved data including ID
    res.status(201).json({
      success: true,
      message: "Data latihan berhasil disimpan",
      data: { id: savedWorkout.id }
    });
  } catch (error) {
    console.error("Error saving workout:", error);
    res.status(500).json({ 
      success: false,
      error: "Gagal menyimpan data latihan" 
    });
  }
});

// Updated endpoint to get all saved workouts
app.get("/api/saved-workouts", (req, res) => {
  try {
    res.json({
      success: true,
      data: workoutStorage.getAll()
    });
  } catch (error) {
    console.error("Error getting saved workouts:", error);
    res.status(500).json({
      success: false,
      error: "Gagal mengambil data latihan tersimpan"
    });
  }
});

// Updated endpoint to get a specific saved workout by ID
app.get("/api/saved-workouts/:id", (req, res) => {
  try {
    const workout = workoutStorage.findById(req.params.id);
    
    if (workout) {
      res.json({
        success: true,
        data: workout
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Data latihan tidak ditemukan"
      });
    }
  } catch (error) {
    console.error("Error getting workout by ID:", error);
    res.status(500).json({
      success: false,
      error: "Gagal mengambil data latihan"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server proxy berjalan di port ${PORT}`);
  console.log(`API Python tersedia di ${PYTHON_API}`);
});