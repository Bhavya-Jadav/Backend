// server/routes/ideaRoutes.js
const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const Problem = require('../models/Problem');
const User = require('../models/User');
const { protect, admin, student, adminOrCompany } = require('../middleware/authMiddleware'); // Import auth middleware

// @desc    Get all ideas (for admin dashboard)
// @route   GET /api/ideas
// @access  Private/Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    console.log('🚀 ADMIN IDEAS ROUTE - Getting all ideas');
    
    // Get all ideas with populated data
    const ideas = await Idea.find({})
                           .populate('student', 'username name email university course year skills profilePicture')
                           .populate('problem', 'title company branch')
                           .sort({ createdAt: -1 })
                           .lean();

    console.log(`📊 Found ${ideas.length} total ideas`);
    
    res.json(ideas);
  } catch (error) {
    console.error("Fetch all ideas error:", error);
    res.status(500).json({ message: 'Server Error fetching all ideas' });
  }
});

// @desc    Submit a new idea for a problem
// @route   POST /api/ideas
// @access  Private/Student
router.post('/', protect, student, async (req, res) => {
  const { problemId, ideaText, implementationApproach } = req.body;

  try {
    // Basic validation
    if (!problemId || !ideaText) {
       return res.status(400).json({ message: 'Problem ID and idea text are required' });
    }

    // Check if problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
       return res.status(404).json({ message: 'Problem not found' });
    }

    // Check if student has already submitted an idea for this problem (using unique index)
    const existingIdea = await Idea.findOne({ student: req.user._id, problem: problemId });
    if (existingIdea) {
        return res.status(400).json({ message: 'You have already submitted an idea for this problem.' });
    }

    const idea = new Idea({
      student: req.user._id, // From protect middleware
      problem: problemId,
      ideaText,
      implementationApproach: implementationApproach || ''
    });

    const createdIdea = await idea.save();

    // Optional: Populate student and problem details before sending response
    await createdIdea.populate('student', 'username name email phone bio university course year skills profilePicture');
    await createdIdea.populate('problem', 'title');

    res.status(201).json(createdIdea);
  } catch (error) {
    console.error("Submit idea error:", error);
    // Handle duplicate key error from unique index
    if (error.code === 11000) {
        return res.status(400).json({ message: 'You have already submitted an idea for this problem.' });
    }
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server Error submitting idea' });
  }
});

// @desc    Get all ideas for a specific problem (for admins and companies to view)
// @route   GET /api/ideas/problem/:problemId
// @access  Private/Admin or Company
router.get('/problem/:problemId', protect, adminOrCompany, async (req, res) => {
  try {
    console.log('🚀 IDEAS ROUTE DEBUG - Starting request');
    console.log('👤 User accessing ideas:', {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    });

    // If user is a company, check if they own this problem
    if (req.user.role === 'company') {
      const Problem = require('../models/Problem');
      const problem = await Problem.findById(req.params.problemId);
      
      if (!problem) {
        return res.status(404).json({ message: 'Problem not found' });
      }
      
      if (problem.postedBy.toString() !== req.user._id.toString()) {
        console.log('❌ COMPANY ACCESS DENIED - Problem not owned by this company');
        return res.status(403).json({ message: 'Access denied. You can only view ideas for problems you posted' });
      }
      
      console.log('✅ COMPANY OWNERSHIP VERIFIED - Company owns this problem');
    } else {
      // Admins can view ideas for any problem
      console.log('✅ ADMIN ACCESS GRANTED - Admin can view all problem ideas');
    }
    // Ultra-fast query - minimal data, no population for speed
    const ideas = await Idea.find({ problem: req.params.problemId })
                            .select('ideaText implementationApproach student createdAt') // Only essential fields
                            .sort({ createdAt: -1 })
                            .lean(); // Fastest possible query

    // Quick batch student lookup
    const studentIds = ideas.map(idea => idea.student);
    console.log('🔍 Looking for student IDs:', studentIds);
    
    const students = await User.find({ _id: { $in: studentIds } })
                              .select('username name email university course year skills profilePicture')
                              .lean();
    
    console.log('🎓 Found students from database:', students.length);
    console.log('📊 All students data:', students.map(s => ({
      id: s._id,
      name: s.name,
      university: s.university,
      course: s.course,
      skills: s.skills,
      skillsLength: s.skills?.length || 0
    })));

    // Quick mapping without heavy operations
    const studentMap = {};
    students.forEach(student => {
      studentMap[student._id] = student;
      console.log(`👤 Mapping student ${student._id}: course=${student.course}, skills=${JSON.stringify(student.skills)}`);
    });

    // Attach student data
    ideas.forEach(idea => {
      const studentData = studentMap[idea.student];
      if (studentData) {
        idea.student = studentData;
        console.log(`✅ Attached data for student ${studentData.name}: course=${studentData.course}, skills=${JSON.stringify(studentData.skills)}`);
      } else {
        idea.student = { 
          username: 'Unknown', 
          name: 'Unknown', 
          skills: [], 
          university: '', 
          course: '',
          year: '',
          profilePicture: null
        };
        console.log(`❌ No data found for student ID: ${idea.student}`);
      }
    });

    console.log('📊 Final sample idea:', {
      ideaId: ideas[0]?._id,
      studentName: ideas[0]?.student?.name,
      studentCourse: ideas[0]?.student?.course,
      studentSkills: ideas[0]?.student?.skills,
      hasSkills: ideas[0]?.student?.skills?.length > 0
    });
    res.json(ideas);
  } catch (error) {
    console.error("Fetch ideas error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get a single idea by ID (for admins to view details)
// @route   GET /api/ideas/:id
// @access  Private/Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id)
                           .populate('student', 'username name email phone bio university course year skills profilePicture')
                           .populate('problem', 'title');

    if (idea) {
      res.json(idea);
    } else {
      res.status(404).json({ message: 'Idea not found' });
    }
  } catch (error) {
    console.error("Fetch idea by ID error:", error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Idea not found (Invalid ID format)' });
    }
    res.status(500).json({ message: 'Server Error fetching idea' });
  }
});

// @desc    Update an idea (e.g., status)
// @route   PUT /api/ideas/:id
// @access  Private/Admin
// router.put('/:id', protect, admin, async (req, res) => {
//     // Implementation similar to POST, but use findByIdAndUpdate
//     res.status(501).json({ message: 'Update idea not implemented yet.' });
// });

// @desc    Delete an idea
// @route   DELETE /api/ideas/:id
// @access  Private/Admin or Student (own idea?)
// router.delete('/:id', protect, admin, async (req, res) => {
//     // Implementation: Find by ID and delete
//     res.status(501).json({ message: 'Delete idea not implemented yet.' });
// });

module.exports = router;
