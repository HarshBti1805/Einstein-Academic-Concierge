import prisma from "../db.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

/**
 * Login/Register a student by validating their credentials against the database
 * This matches ALL fields the frontend sends to ensure the student exists
 */
export const loginStudent = async (req, res) => {
  try {
    const {
      name,
      rollNumber,
      email,
      university,
      yearOfStudy,
      passoutYear,
      branch,
    } = req.body;

    // Validate required fields
    if (!name || !rollNumber || !email || !university || !yearOfStudy || !passoutYear || !branch) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    // Parse year of study from "1st Year", "2nd Year", etc. to number
    const parseYearOfStudy = (yearString) => {
      const match = yearString.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const parsedYearOfStudy = parseYearOfStudy(yearOfStudy);
    const parsedPassoutYear = parseInt(passoutYear, 10);

    // Find student with matching credentials
    const student = await prisma.student.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        rollNumber: {
          equals: rollNumber,
          mode: 'insensitive'
        },
        email: {
          equals: email,
          mode: 'insensitive'
        },
        universityName: {
          equals: university,
          mode: 'insensitive'
        },
        yearOfStudy: parsedYearOfStudy,
        expectedGraduation: parsedPassoutYear,
        branch: {
          equals: branch,
          mode: 'insensitive'
        }
      }
    });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials. Please check your information and try again."
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        studentId: student.studentId,
        id: student.id,
        name: student.name,
        email: student.email 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success with token and basic student info
    res.json({
      success: true,
      message: "Login successful",
      token,
      student: {
        student_id: student.studentId,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        universityName: student.universityName,
        branch: student.branch,
        yearOfStudy: student.yearOfStudy,
        expectedGraduation: student.expectedGraduation
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during authentication" 
    });
  }
};

/**
 * Login for university admin using access code
 */
export const loginUniversity = async (req, res) => {
  try {
    const { accessCode } = req.body;

    if (!accessCode) {
      return res.status(400).json({
        error: "Access code is required"
      });
    }

    // For now, use a simple access code validation
    // In production, this should be stored in a database with proper security
    const validAccessCodes = process.env.UNIVERSITY_ACCESS_CODES 
      ? process.env.UNIVERSITY_ACCESS_CODES.split(',').map(code => code.trim())
      : ['UNIV2024', 'ADMIN123', 'EINSTEIN2024']; // Default fallback codes

    if (!validAccessCodes.includes(accessCode)) {
      return res.status(401).json({
        error: "Invalid access code"
      });
    }

    // Get unique university name from access code or use a default
    // In production, this should query a University table
    const universityName = accessCode.startsWith('UNIV') 
      ? `University ${accessCode.slice(4)}`
      : `University (${accessCode})`;

    // Return university info (no JWT needed for admin, using localStorage instead)
    res.json({
      success: true,
      university: {
        accessCode,
        name: universityName,
        authenticated: true
      }
    });

  } catch (error) {
    console.error("University login error:", error);
    res.status(500).json({
      error: "Server error during authentication"
    });
  }
};

/**
 * Verify JWT token and return student info
 */
export const verifyToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: "No token provided" 
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Fetch current student data
      const student = await prisma.student.findUnique({
        where: { studentId: decoded.studentId }
      });

      if (!student) {
        return res.status(404).json({ 
          success: false,
          message: "Student not found" 
        });
      }

      res.json({
        success: true,
        student: {
          student_id: student.studentId,
          name: student.name,
          email: student.email,
          rollNumber: student.rollNumber,
          universityName: student.universityName,
          branch: student.branch,
          yearOfStudy: student.yearOfStudy,
          expectedGraduation: student.expectedGraduation
        }
      });

    } catch (jwtError) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid or expired token" 
      });
    }

  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};
