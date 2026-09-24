const User = require("./models/userModel");
const { validateUpdateProfile } = require("./middleware/validationMiddleware");
const { uploadSingleImage } = require("./middleware/uploadMiddleware");
const { getMe, updateMe, uploadProfileImage } = require("./controllers/userController");
const { isCloudinaryConfigured, uploadStream, deleteImage } = require("./config/cloudinary");

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING STUDENT PROFILE & CLOUDINARY INTEGRATION");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: User Schema Attributes
  console.log("--- 1. User Model Schema Validation ---");
  {
    const userInstance = new User({
      name: "John Doe",
      email: "john@university.edu",
      password: "hashedpassword123",
      college: "Stanford University",
      course: "B.Tech Computer Science",
      year: "3rd Year",
      subjects: ["Algorithms", "Distributed Systems", "Database Systems"],
    });

    assert(userInstance.name === "John Doe", "User schema includes 'name'");
    assert(userInstance.email === "john@university.edu", "User schema includes 'email'");
    assert(userInstance.college === "Stanford University", "User schema includes 'college'");
    assert(userInstance.course === "B.Tech Computer Science", "User schema includes 'course'");
    assert(userInstance.year === "3rd Year", "User schema includes 'year'");
    assert(Array.isArray(userInstance.subjects) && userInstance.subjects.length === 3, "User schema includes 'subjects' array");
    assert(userInstance.profilePicture && userInstance.profilePicture.url !== undefined, "User schema includes default 'profilePicture.url'");
    assert(userInstance.gender === "other", "User schema includes 'gender' with default 'other'");

    const { getDefaultAvatarForGender } = require("./models/userModel");
    assert(typeof getDefaultAvatarForGender === "function", "getDefaultAvatarForGender helper exists");
    assert(getDefaultAvatarForGender("female").includes("avatar-8"), "getDefaultAvatarForGender generates female avatar for female gender");
    assert(getDefaultAvatarForGender("male").includes("avatar-7"), "getDefaultAvatarForGender generates male avatar for male gender");
  }

  // Test 2: Validation Middleware - validateUpdateProfile
  console.log("\n--- 2. Profile Validation Middleware ---");
  {
    // Valid update with comma separated subjects
    const req = {
      body: {
        name: "Jane Doe",
        school: "MIT",
        course: "AI & ML",
        year: "2nd Year",
        subjects: "Math, Physics, Computing",
      },
    };
    let nextCalled = false;
    validateUpdateProfile(req, {}, () => { nextCalled = true; });
    assert(nextCalled, "validateUpdateProfile accepts valid profile updates");
    assert(req.body.college === "MIT", "validateUpdateProfile maps 'school' to 'college'");
    assert(Array.isArray(req.body.subjects) && req.body.subjects.length === 3, "validateUpdateProfile converts comma string subjects to array");

    // Invalid email in profile update
    const badEmailReq = { body: { email: "invalid-email-format" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; },
    };
    let badNextCalled = false;
    validateUpdateProfile(badEmailReq, res, () => { badNextCalled = true; });
    assert(statusSent === 400 && !badNextCalled, "validateUpdateProfile rejects invalid email format with 400");
  }

  // Test 3: Upload Middleware Image Filter
  console.log("\n--- 3. File Upload Middleware ---");
  {
    const req = {
      headers: { "content-type": "multipart/form-data" },
      pipe: (dest) => {},
      on: () => {},
    };
    // Multer single image middleware exists
    const middleware = uploadSingleImage("image");
    assert(typeof middleware === "function", "uploadSingleImage returns an Express middleware function");
  }

  // Test 4: Cloudinary Configuration and Utilities
  console.log("\n--- 4. Cloudinary Configuration & Helpers ---");
  {
    assert(typeof isCloudinaryConfigured === "function", "isCloudinaryConfigured helper is defined");
    assert(typeof uploadStream === "function", "uploadStream helper is defined");
    assert(typeof deleteImage === "function", "deleteImage helper is defined");

    // When Cloudinary is not configured, uploadStream gracefully rejects with informative message
    if (!isCloudinaryConfigured()) {
      let errorCaught = null;
      try {
        await uploadStream(Buffer.from("fake image data"));
      } catch (err) {
        errorCaught = err;
      }
      assert(errorCaught && errorCaught.message.includes("Cloudinary"), "uploadStream gracefully rejects when Cloudinary credentials are missing");
    }
  }

  // Test 5: uploadProfileImage Controller rejects request without file
  console.log("\n--- 5. User Controller Handlers ---");
  {
    const reqNoFile = {
      user: { _id: "507f1f77bcf86cd799439011" },
      file: null,
    };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; },
    };
    await uploadProfileImage(reqNoFile, res, () => {});
    assert(statusSent === 400 && jsonSent.message.includes("image"), "uploadProfileImage controller rejects request without file with 400");
  }

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
