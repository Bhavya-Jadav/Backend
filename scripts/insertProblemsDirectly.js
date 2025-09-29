// Direct MongoDB insertion script for test problems
const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/engineer-connect';

const testProblems = [
  {
    company: 'AI Usecase',
    branch: 'computer',
    title: 'Smart Traffic Management System Using AI',
    description: 'Design and develop an AI-powered traffic management system that can optimize traffic flow in urban areas. The system should use computer vision to analyze real-time traffic patterns, predict congestion, and automatically adjust traffic light timings. Consider factors like emergency vehicle priority, pedestrian crossing times, and weather conditions. Your solution should reduce average waiting time by at least 30% compared to traditional fixed-timing systems.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    difficulty: 'advanced',
    tags: ['AI', 'Computer Vision', 'Traffic Management', 'Machine Learning', 'IoT'],
    views: 0,
    postedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    quiz: {
      enabled: true,
      title: 'Smart Traffic Management Quiz',
      description: 'Test your understanding of AI-powered traffic management systems',
      questions: [
        {
          question: 'Which AI technique is most suitable for real-time traffic pattern recognition?',
          type: 'multiple-choice',
          options: [
            { text: 'Computer Vision with Deep Learning', isCorrect: true },
            { text: 'Natural Language Processing', isCorrect: false },
            { text: 'Genetic Algorithms', isCorrect: false },
            { text: 'Expert Systems', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What is the primary advantage of adaptive traffic control over fixed-timing systems?',
          type: 'multiple-choice',
          options: [
            { text: 'Lower installation cost', isCorrect: false },
            { text: 'Dynamic response to real-time traffic conditions', isCorrect: true },
            { text: 'Simpler maintenance', isCorrect: false },
            { text: 'Better weather resistance', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'Which sensor technology is most effective for detecting vehicle presence at intersections?',
          type: 'multiple-choice',
          options: [
            { text: 'Ultrasonic sensors', isCorrect: false },
            { text: 'Inductive loop detectors', isCorrect: false },
            { text: 'Computer vision cameras', isCorrect: true },
            { text: 'Pressure plates', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'How should emergency vehicles be prioritized in an AI traffic system?',
          type: 'multiple-choice',
          options: [
            { text: 'Manual override only', isCorrect: false },
            { text: 'Automatic detection and immediate green light', isCorrect: true },
            { text: 'Radio frequency identification', isCorrect: false },
            { text: 'Pre-scheduled routes', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What machine learning approach is best for predicting traffic congestion?',
          type: 'multiple-choice',
          options: [
            { text: 'Supervised learning with historical data', isCorrect: true },
            { text: 'Unsupervised clustering', isCorrect: false },
            { text: 'Reinforcement learning only', isCorrect: false },
            { text: 'Rule-based systems', isCorrect: false }
          ],
          points: 2
        }
      ],
      timeLimit: 15,
      passingScore: 70
    }
  },
  {
    company: 'AI Usecase',
    branch: 'mechanical',
    title: 'Autonomous Drone Delivery System Design',
    description: 'Create a comprehensive design for an autonomous drone delivery system capable of handling packages up to 5kg within a 20km radius. Your design must include mechanical components, flight control systems, obstacle avoidance, weather resistance, and emergency landing protocols. Consider battery optimization, payload distribution, and integration with existing logistics networks. The system should achieve 95% delivery success rate in various weather conditions.',
    videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    difficulty: 'advanced',
    tags: ['Drones', 'Autonomous Systems', 'Mechanical Design', 'Logistics', 'Robotics'],
    views: 0,
    postedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    quiz: {
      enabled: true,
      title: 'Autonomous Drone Delivery Quiz',
      description: 'Test your knowledge of autonomous drone delivery systems',
      questions: [
        {
          question: 'What is the most critical factor in drone payload capacity design?',
          type: 'multiple-choice',
          options: [
            { text: 'Motor power and battery life balance', isCorrect: true },
            { text: 'Aesthetic appearance', isCorrect: false },
            { text: 'Color scheme', isCorrect: false },
            { text: 'Brand recognition', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'Which sensor combination is essential for obstacle avoidance in drones?',
          type: 'multiple-choice',
          options: [
            { text: 'GPS only', isCorrect: false },
            { text: 'LiDAR, cameras, and ultrasonic sensors', isCorrect: true },
            { text: 'Barometric pressure sensors', isCorrect: false },
            { text: 'Temperature sensors', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What is the optimal propeller configuration for delivery drones?',
          type: 'multiple-choice',
          options: [
            { text: 'Single rotor', isCorrect: false },
            { text: 'Quadcopter (4 rotors)', isCorrect: true },
            { text: 'Dual rotor', isCorrect: false },
            { text: 'Eight rotors', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'How should emergency landing be handled in autonomous drones?',
          type: 'multiple-choice',
          options: [
            { text: 'Immediate crash landing', isCorrect: false },
            { text: 'Automated safe zone identification and controlled descent', isCorrect: true },
            { text: 'Return to base only', isCorrect: false },
            { text: 'Hover indefinitely', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What battery technology is most suitable for delivery drones?',
          type: 'multiple-choice',
          options: [
            { text: 'Lead-acid batteries', isCorrect: false },
            { text: 'Lithium Polymer (LiPo) batteries', isCorrect: true },
            { text: 'Nickel-metal hydride', isCorrect: false },
            { text: 'Alkaline batteries', isCorrect: false }
          ],
          points: 2
        }
      ],
      timeLimit: 15,
      passingScore: 70
    }
  },
  {
    company: 'AI Usecase',
    branch: 'electrical',
    title: 'Smart Grid Energy Management with IoT Integration',
    description: 'Design a smart grid energy management system that integrates renewable energy sources, energy storage, and IoT devices for optimal power distribution. The system should predict energy demand, manage load balancing, integrate solar/wind power, and provide real-time monitoring. Include fault detection, automatic switching, and consumer energy usage optimization. Target 25% reduction in energy waste and 40% improvement in grid reliability.',
    videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    difficulty: 'intermediate',
    tags: ['Smart Grid', 'IoT', 'Renewable Energy', 'Power Systems', 'Energy Management'],
    views: 0,
    postedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    quiz: {
      enabled: true,
      title: 'Smart Grid Management Quiz',
      description: 'Evaluate your understanding of smart grid energy management systems',
      questions: [
        {
          question: 'What is the primary benefit of smart grid technology?',
          type: 'multiple-choice',
          options: [
            { text: 'Reduced installation costs', isCorrect: false },
            { text: 'Bidirectional energy flow and real-time monitoring', isCorrect: true },
            { text: 'Simpler wiring', isCorrect: false },
            { text: 'Lower voltage requirements', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'Which communication protocol is most suitable for IoT devices in smart grids?',
          type: 'multiple-choice',
          options: [
            { text: 'Bluetooth', isCorrect: false },
            { text: 'WiFi only', isCorrect: false },
            { text: 'LoRaWAN or Zigbee', isCorrect: true },
            { text: 'Infrared', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'How does demand response work in smart grids?',
          type: 'multiple-choice',
          options: [
            { text: 'Fixed pricing all day', isCorrect: false },
            { text: 'Dynamic pricing based on real-time demand', isCorrect: true },
            { text: 'Manual switching only', isCorrect: false },
            { text: 'Random load distribution', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What role do smart meters play in energy management?',
          type: 'multiple-choice',
          options: [
            { text: 'Only billing purposes', isCorrect: false },
            { text: 'Real-time energy monitoring and two-way communication', isCorrect: true },
            { text: 'Decoration only', isCorrect: false },
            { text: 'Weather monitoring', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'Which energy storage technology is most effective for grid-scale applications?',
          type: 'multiple-choice',
          options: [
            { text: 'Car batteries', isCorrect: false },
            { text: 'Lithium-ion battery systems', isCorrect: true },
            { text: 'Capacitors only', isCorrect: false },
            { text: 'Mechanical springs', isCorrect: false }
          ],
          points: 2
        }
      ],
      timeLimit: 12,
      passingScore: 70
    }
  },
  {
    company: 'AI Usecase',
    branch: 'civil',
    title: 'Earthquake-Resistant Smart Building Design',
    description: 'Develop a comprehensive design for a 20-story smart building that can withstand magnitude 8.0 earthquakes while maintaining structural integrity and occupant safety. Incorporate smart sensors for real-time structural health monitoring, automated emergency response systems, and adaptive damping mechanisms. Include sustainable materials, energy-efficient systems, and IoT integration for building management. The design should meet international seismic safety standards and reduce construction costs by 15%.',
    videoUrl: 'https://www.youtube.com/watch?v=hFZFjoX2cGg',
    difficulty: 'advanced',
    tags: ['Earthquake Engineering', 'Smart Buildings', 'Structural Design', 'IoT', 'Safety Systems'],
    views: 0,
    postedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    quiz: {
      enabled: true,
      title: 'Earthquake-Resistant Building Quiz',
      description: 'Test your knowledge of earthquake-resistant smart building design',
      questions: [
        {
          question: 'What is the most effective structural system for earthquake resistance in high-rise buildings?',
          type: 'multiple-choice',
          options: [
            { text: 'Rigid frame only', isCorrect: false },
            { text: 'Base isolation with damping systems', isCorrect: true },
            { text: 'Simple beam construction', isCorrect: false },
            { text: 'Unreinforced masonry', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'Which sensor type is crucial for structural health monitoring?',
          type: 'multiple-choice',
          options: [
            { text: 'Temperature sensors only', isCorrect: false },
            { text: 'Accelerometers and strain gauges', isCorrect: true },
            { text: 'Light sensors', isCorrect: false },
            { text: 'Humidity sensors', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What is the primary function of base isolation in earthquake-resistant design?',
          type: 'multiple-choice',
          options: [
            { text: 'Increase building height', isCorrect: false },
            { text: 'Decouple building from ground motion', isCorrect: true },
            { text: 'Reduce construction cost', isCorrect: false },
            { text: 'Improve aesthetics', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'How do tuned mass dampers help in earthquake resistance?',
          type: 'multiple-choice',
          options: [
            { text: 'Add weight to the building', isCorrect: false },
            { text: 'Counteract building oscillations', isCorrect: true },
            { text: 'Generate electricity', isCorrect: false },
            { text: 'Provide ventilation', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What building material combination provides optimal earthquake resistance?',
          type: 'multiple-choice',
          options: [
            { text: 'Pure concrete', isCorrect: false },
            { text: 'Reinforced concrete with steel frame', isCorrect: true },
            { text: 'Wood only', isCorrect: false },
            { text: 'Brick and mortar', isCorrect: false }
          ],
          points: 2
        }
      ],
      timeLimit: 15,
      passingScore: 70
    }
  },
  {
    company: 'AI Usecase',
    branch: 'chemical',
    title: 'Sustainable Plastic Recycling Process Innovation',
    description: 'Design an innovative chemical process for converting mixed plastic waste into high-quality recycled materials with minimal environmental impact. The process should handle PET, HDPE, PP, and PS plastics simultaneously, achieve 90% material recovery rate, and produce recycled plastic with properties comparable to virgin materials. Include energy recovery systems, waste heat utilization, and closed-loop water recycling. Consider economic viability and scalability for industrial implementation.',
    videoUrl: 'https://www.youtube.com/watch?v=BxV14h0kFs0',
    difficulty: 'intermediate',
    tags: ['Recycling', 'Sustainability', 'Chemical Process', 'Environmental Engineering', 'Circular Economy'],
    views: 0,
    postedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    quiz: {
      enabled: true,
      title: 'Plastic Recycling Process Quiz',
      description: 'Assess your understanding of sustainable plastic recycling processes',
      questions: [
        {
          question: 'What is the most challenging aspect of mixed plastic recycling?',
          type: 'multiple-choice',
          options: [
            { text: 'Color sorting', isCorrect: false },
            { text: 'Different melting points and chemical compatibility', isCorrect: true },
            { text: 'Size reduction', isCorrect: false },
            { text: 'Transportation costs', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'Which separation technique is most effective for plastic type identification?',
          type: 'multiple-choice',
          options: [
            { text: 'Manual sorting', isCorrect: false },
            { text: 'Near-infrared spectroscopy', isCorrect: true },
            { text: 'Color recognition', isCorrect: false },
            { text: 'Weight measurement', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What is the optimal temperature range for PET depolymerization?',
          type: 'multiple-choice',
          options: [
            { text: '100-150°C', isCorrect: false },
            { text: '250-300°C', isCorrect: true },
            { text: '400-500°C', isCorrect: false },
            { text: '50-100°C', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'How can energy efficiency be maximized in plastic recycling processes?',
          type: 'multiple-choice',
          options: [
            { text: 'Use maximum heating', isCorrect: false },
            { text: 'Heat recovery and process integration', isCorrect: true },
            { text: 'Ignore energy consumption', isCorrect: false },
            { text: 'Use only electric heating', isCorrect: false }
          ],
          points: 2
        },
        {
          question: 'What catalyst is commonly used in plastic depolymerization?',
          type: 'multiple-choice',
          options: [
            { text: 'Platinum', isCorrect: false },
            { text: 'Zeolite-based catalysts', isCorrect: true },
            { text: 'Gold nanoparticles', isCorrect: false },
            { text: 'Silver compounds', isCorrect: false }
          ],
          points: 2
        }
      ],
      timeLimit: 12,
      passingScore: 70
    }
  }
];

async function insertProblems() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const problemsCollection = db.collection('problems');
    
    // Clear existing AI Usecase problems
    await problemsCollection.deleteMany({ company: 'AI Usecase' });
    console.log('Cleared existing AI Usecase problems');
    
    // Insert new problems
    const result = await problemsCollection.insertMany(testProblems);
    console.log(`Successfully inserted ${result.insertedCount} problems`);
    
    // Display inserted problems
    testProblems.forEach((problem, index) => {
      console.log(`\n${index + 1}. ${problem.title}`);
      console.log(`   Branch: ${problem.branch}`);
      console.log(`   Difficulty: ${problem.difficulty}`);
      console.log(`   Quiz Questions: ${problem.quiz.questions.length}`);
      console.log(`   Tags: ${problem.tags.join(', ')}`);
    });
    
    console.log('\n✅ Test problems inserted successfully!');
    
  } catch (error) {
    console.error('Error inserting problems:', error);
  } finally {
    await client.close();
  }
}

insertProblems();
