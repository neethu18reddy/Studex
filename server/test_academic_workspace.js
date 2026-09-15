const mongoose = require("mongoose");
const Subject = require("./models/subjectModel");
const Resource = require("./models/resourceModel");
const {
  validateSubjectCreate,
  validateResourceCreate,
  validateObjectId,
} = require("./middleware/validationMiddleware");
const { uploadResourceFile } = require("./middleware/uploadMiddleware");

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING ACADEMIC WORKSPACE (SUBJECTS & RESOURCES)");
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

  // 1. Subject Model Schema Validation
  console.log("--- 1. Subject Model Schema Validation ---");
  {
    const userId = new mongoose.Types.ObjectId();
    const subject = new Subject({
      name: "Operating Systems",
      code: "CS301",
      description: "Processes, Threads, Concurrency, and Memory Management",
      color: "#3b82f6",
      semester: "Semester 5",
      user: userId,
    });

    assert(subject.name === "Operating Systems", "Subject schema includes 'name'");
    assert(subject.code === "CS301", "Subject schema includes 'code'");
    assert(subject.color === "#3b82f6", "Subject schema includes 'color'");
    assert(subject.semester === "Semester 5", "Subject schema includes 'semester'");
    assert(subject.user.equals(userId), "Subject schema references 'user'");
  }

  // 2. Resource Model Schema Validation (PDF, Image, Document, Link)
  console.log("\n--- 2. Resource Model Schema Validation (4 Types) ---");
  {
    const userId = new mongoose.Types.ObjectId();
    const subjectId = new mongoose.Types.ObjectId();

    const pdfResource = new Resource({
      title: "Lecture 01 - Intro PDF",
      type: "pdf",
      url: "https://res.cloudinary.com/studex/raw/upload/lecture1.pdf",
      public_id: "studex/resources/lecture1",
      fileName: "lecture1.pdf",
      fileSize: 1024500,
      subject: subjectId,
      user: userId,
      tags: ["lecture", "slides"],
    });
    assert(pdfResource.type === "pdf", "Resource schema supports 'pdf' type");

    const imgResource = new Resource({
      title: "Memory Hierarchy Diagram",
      type: "image",
      url: "https://res.cloudinary.com/studex/image/upload/hierarchy.png",
      public_id: "studex/resources/hierarchy",
      fileName: "hierarchy.png",
      subject: subjectId,
      user: userId,
    });
    assert(imgResource.type === "image", "Resource schema supports 'image' type");

    const docResource = new Resource({
      title: "Syllabus & Lab Guide",
      type: "document",
      url: "https://res.cloudinary.com/studex/raw/upload/guide.docx",
      subject: subjectId,
      user: userId,
    });
    assert(docResource.type === "document", "Resource schema supports 'document' type");

    const linkResource = new Resource({
      title: "MIT Distributed Systems Video Lecture",
      type: "link",
      url: "https://www.youtube.com/watch?v=example",
      subject: subjectId,
      user: userId,
    });
    assert(linkResource.type === "link", "Resource schema supports 'link' type");
  }

  // 3. Validation Middleware - validateSubjectCreate
  console.log("\n--- 3. Subject Validation Middleware ---");
  {
    const reqEmpty = { body: { name: "" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; },
    };
    let nextCalled = false;
    validateSubjectCreate(reqEmpty, res, () => { nextCalled = true; });
    assert(statusSent === 400 && !nextCalled, "validateSubjectCreate rejects empty subject name with 400");

    const reqValid = { body: { name: "Database Systems", code: "cs202", color: "#10b981" } };
    let validNext = false;
    validateSubjectCreate(reqValid, {}, () => { validNext = true; });
    assert(validNext && reqValid.body.code === "CS202", "validateSubjectCreate normalizes code to uppercase and calls next");
  }

  // 4. Validation Middleware - validateResourceCreate
  console.log("\n--- 4. Resource Validation Middleware ---");
  {
    const subjectId = new mongoose.Types.ObjectId().toString();

    // Rejection when title is missing
    const reqNoTitle = { body: { title: "", subject: subjectId, url: "https://example.com" } };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status: (code) => { statusSent = code; return res; },
      json: (data) => { jsonSent = data; return res; },
    };
    let nextCalled = false;
    validateResourceCreate(reqNoTitle, res, () => { nextCalled = true; });
    assert(statusSent === 400 && !nextCalled, "validateResourceCreate rejects missing title with 400");

    // Rejection when subject is invalid ObjectId
    const reqBadSub = { body: { title: "Cheat Sheet", subject: "not-an-id", url: "https://example.com" } };
    statusSent = null;
    validateResourceCreate(reqBadSub, res, () => {});
    assert(statusSent === 400, "validateResourceCreate rejects invalid subject ObjectId with 400");

    // Valid Link resource
    const reqValidLink = { body: { title: "Documentation", subject: subjectId, url: "https://react.dev" } };
    let validNext = false;
    validateResourceCreate(reqValidLink, {}, () => { validNext = true; });
    assert(validNext, "validateResourceCreate approves valid link resource");

    // Valid File upload resource (without URL because file buffer will provide URL)
    const reqValidFile = { body: { title: "Lab 1 PDF", subject: subjectId }, file: { originalname: "lab1.pdf" } };
    let validFileNext = false;
    validateResourceCreate(reqValidFile, {}, () => { validFileNext = true; });
    assert(validFileNext, "validateResourceCreate approves file upload without pre-existing URL");
  }

  // 5. Upload Middleware - uploadResourceFile
  console.log("\n--- 5. Resource Upload Middleware ---");
  {
    const middleware = uploadResourceFile("file");
    assert(typeof middleware === "function", "uploadResourceFile returns Express middleware");
  }

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
