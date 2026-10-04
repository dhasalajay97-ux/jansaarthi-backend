const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config({
    path: path.join(__dirname, ".env")
});


const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("फक्त PDF, JPG किंवा PNG files allowed आहेत."));
        }
    }
});
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.get("/", (req, res) => {

    res.json({
        message: "JanSaarthi Backend चालू आहे 🚀"
    });

});


app.post("/api/auth/register", (req, res) => {

    const {
        name,
        mobile,
        age,
        occupation,
        income,
        state,
        district,
        category
    } = req.body;

    if (
        !name ||
        !mobile ||
        !age ||
        !occupation ||
        !income ||
        !state ||
        !district ||
        !category
    ) {
        return res.status(400).json({
            message: "कृपया सर्व माहिती भरा."
        });
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
        return res.status(400).json({
            message: "कृपया योग्य १० अंकी मोबाईल नंबर टाका."
        });
    }
    const checkSql = `
        SELECT id
        FROM users
        WHERE mobile = ?
        LIMIT 1
    `;

    db.query(
        checkSql,
        [mobile],
        (err, results) => {

            if (err) {

                console.error(
                    "USER CHECK ERROR:",
                    err
                );

                return res.status(500).json({
                    message: "Database error"
                });
            }

            if (results.length > 0) {

                return res.status(409).json({
                    message:
                        "हा मोबाईल नंबर आधीच नोंदणीकृत आहे."
                });
            }
            const insertSql = `
                INSERT INTO users
                (
                    name,
                    mobile,
                    age,
                    occupation,
                    income,
                    state,
                    district,
                    category
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                name,
                mobile,
                age,
                occupation,
                income,
                state,
                district,
                category
            ];

            db.query(
                insertSql,
                values,
                (err, result) => {

                    if (err) {

                        console.error(
                            "USER REGISTRATION ERROR:",
                            err
                        );

                        return res.status(500).json({
                            message:
                                "नोंदणी करण्यात अडचण आली."
                        });
                    }

                    res.status(201).json({

                        message:
                            "नोंदणी यशस्वी झाली.",

                        userId:
                            result.insertId
                    });
                }
            );
        }
    );
});

app.post("/api/auth/login", (req, res) => {

    const { mobile } = req.body;

    if (!mobile) {

        return res.status(400).json({
            message:
                "मोबाईल नंबर भरा."
        });
    }

    if (!/^[0-9]{10}$/.test(mobile)) {

        return res.status(400).json({
            message:
                "कृपया योग्य १० अंकी मोबाईल नंबर टाका."
        });
    }

    const sql = `
        SELECT
            id,
            name,
            mobile,
            age,
            occupation,
            income,
            state,
            district,
            category,
            caste
        FROM users
        WHERE mobile = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [mobile],
        (err, results) => {

            if (err) {

                console.error(
                    "USER LOGIN ERROR:",
                    err
                );

                return res.status(500).json({
                    message: "Database error"
                });
            }
if (results.length === 0) {

                return res.json({
                    newUser: true,
                    mobile: mobile
                });
            }

            // Existing user
            return res.json({
                newUser: false,
                user: results[0]
            });
        }
    );
});app.post("/api/profile/create", (req, res) => {

    const {
        mobile,
        name,
        age,
        gender,
        state,
        district,
        area_type,
        caste,
        occupation,
        income
    } = req.body;

    // ================================
    // REQUIRED FIELD VALIDATION
    // ================================

    if (
        !mobile ||
        !name ||
        !age ||
        !gender ||
        !state ||
        !district ||
        !area_type ||
        !caste ||
        !occupation ||
        !income
    ) {
        return res.status(400).json({
            success: false,
            message: "कृपया सर्व आवश्यक माहिती भरा."
        });
    }

    // ================================
    // MOBILE VALIDATION
    // ================================

    if (!/^[0-9]{10}$/.test(String(mobile))) {

        return res.status(400).json({
            success: false,
            message: "कृपया योग्य १० अंकी मोबाईल नंबर टाका."
        });

    }

    // ================================
    // AGE VALIDATION
    // ================================

    const numericAge = Number(age);

    if (
        !Number.isInteger(numericAge) ||
        numericAge < 1 ||
        numericAge > 120
    ) {
        return res.status(400).json({
            success: false,
            message: "कृपया योग्य वय भरा."
        });
    }

    // ================================
    // CHECK USER
    // ================================

    const checkSql = `
        SELECT id
        FROM users
        WHERE mobile = ?
        LIMIT 1
    `;

    db.query(
        checkSql,
        [mobile],
        (err, results) => {

            if (err) {

                console.error(
                    "PROFILE CHECK ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "Database error आला.",
                    error:
                        err.code ||
                        "DATABASE_ERROR"
                });

            }

            // =================================================
            // EXISTING USER → UPDATE PROFILE
            // =================================================

            if (results.length > 0) {

                const userId =
                    results[0].id;

                const updateSql = `
                    UPDATE users
                    SET
                        name = ?,
                        age = ?,
                        gender = ?,
                        state = ?,
                        district = ?,
                        area_type = ?,
                        caste = ?,
                        category = ?,
                        occupation = ?,
                        income = ?
                    WHERE id = ?
                `;

                const values = [

                    name,
                    numericAge,
                    gender,
                    state,
                    district,
                    area_type,

                    // caste
                    caste,

                    // AI Recommendation साठी category
                    caste,

                    occupation,
                    income,

                    userId
                ];

                db.query(
                    updateSql,
                    values,
                    (err) => {

                        if (err) {

                            console.error(
                                "PROFILE UPDATE ERROR:",
                                err
                            );

                            return res.status(500).json({
                                success: false,
                                message:
                                    "Profile update करताना अडचण आली.",
                                error:
                                    err.code ||
                                    "DATABASE_ERROR"
                            });

                        }

                        // ================================
                        // GET UPDATED USER
                        // ================================

                        const userSql = `
                            SELECT *
                            FROM users
                            WHERE id = ?
                            LIMIT 1
                        `;

                        db.query(
                            userSql,
                            [userId],
                            (err, userResults) => {

                                if (err) {

                                    console.error(
                                        "GET UPDATED USER ERROR:",
                                        err
                                    );

                                    return res.status(500).json({
                                        success: false,
                                        message:
                                            "Profile update झाले पण user data मिळाला नाही."
                                    });

                                }

                                return res.status(200).json({

                                    success: true,

                                    message:
                                        "Profile यशस्वीरित्या तयार झाले.",

                                    user:
                                        userResults[0]

                                });

                            }
                        );

                    }
                );

                return;
            }

            // =================================================
            // NEW USER → INSERT
            // =================================================

            const insertSql = `
                INSERT INTO users
                (
                    name,
                    mobile,
                    age,
                    gender,
                    state,
                    district,
                    area_type,
                    caste,
                    category,
                    occupation,
                    income
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const insertValues = [

                name,
                mobile,
                numericAge,
                gender,
                state,
                district,
                area_type,

                // caste
                caste,

                // AI Recommendation साठी category
                caste,

                occupation,
                income

            ];

            db.query(
                insertSql,
                insertValues,
                (err, result) => {

                    if (err) {

                        console.error(
                            "PROFILE INSERT ERROR:",
                            err
                        );

                        return res.status(500).json({
                            success: false,
                            message:
                                "Profile save करता आले नाही.",
                            error:
                                err.code ||
                                "DATABASE_ERROR"
                        });

                    }

                    // ================================
                    // GET CREATED USER
                    // ================================

                    const userSql = `
                        SELECT *
                        FROM users
                        WHERE id = ?
                        LIMIT 1
                    `;

                    db.query(
                        userSql,
                        [result.insertId],
                        (err, userResults) => {

                            if (err) {

                                console.error(
                                    "GET CREATED USER ERROR:",
                                    err
                                );

                                return res.status(500).json({
                                    success: false,
                                    message:
                                        "Profile तयार झाले पण user data मिळाला नाही."
                                });

                            }

                            return res.status(201).json({

                                success: true,

                                message:
                                    "Profile यशस्वीरित्या तयार झाले.",

                                user:
                                    userResults[0]

                            });

                        }
                    );

                }
            );

        }
    );

});
app.post("/api/admin/login", (req, res) => {

    const {
        username,
        password
    } = req.body;

    if (!username || !password) {

        return res.status(400).json({
            error:
                "Username and password required"
        });

    }

    const sql = `
        SELECT id, username, password
        FROM admins
        WHERE username = ?
        LIMIT 1
    `;

    db.query(
        sql,
        [username],
        (err, results) => {

            if (err) {

                console.error(
                    "ADMIN LOGIN ERROR:",
                    err
                );

                return res.status(500).json({
                    error: "Login failed"
                });

            }

            if (results.length === 0) {

                return res.status(401).json({
                    error:
                        "Invalid username or password"
                });

            }

            const admin = results[0];

            if (password !== admin.password) {

                return res.status(401).json({
                    error:
                        "Invalid username or password"
                });

            }

            res.json({

                message:
                    "Login successful",

                admin: {

                    id: admin.id,

                    username:
                        admin.username

                }

            });

        }
    );

});

app.get("/api/schemes", (req, res) => {

    const sql = `
        SELECT *
        FROM schemes
        ORDER BY updated_at DESC
    `;

    db.query(
        sql,
        (err, results) => {

            if (err) {

                console.error(
                    "GET SCHEMES ERROR:",
                    err
                );

                return res.status(500).json({
                    error: "Database error"
                });

            }

            res.json(results);

        }
    );

});

app.get("/api/schemes/:id", (req, res) => {

    const {
        id
    } = req.params;

    const sql = `
        SELECT *
        FROM schemes
        WHERE id = ?
    `;

    db.query(
        sql,
        [id],
        (err, results) => {

            if (err) {

                console.error(
                    "GET SINGLE SCHEME ERROR:",
                    err
                );

                return res.status(500).json({
                    error: "Database error"
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    error:
                        "Scheme not found"
                });

            }

            res.json(results[0]);

        }
    );

});

app.post("/api/schemes", (req, res) => {

    const {
        name,
        category,
        department,
        state,
        beneficiary,
        type,
        short_description,
        about,
        benefits,
        eligibility,
        documents,
        process,
        official
    } = req.body;

    if (!name || !category) {

        return res.status(400).json({
            error:
                "Scheme name and category are required"
        });

    }

    const sql = `
        INSERT INTO schemes
        (
            name,
            category,
            department,
            state,
            beneficiary,
            type,
            short_description,
            about,
            benefits,
            eligibility,
            documents,
            process,
            official
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        name,
        category,
        department || "",
        state || "",
        beneficiary || "",
        type || "",
        short_description || "",
        about || "",
        benefits || "",
        eligibility || "",
        documents || "",
        process || "",
        official || ""
    ];

    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {

                console.error(
                    "ADD SCHEME ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Scheme add failed"
                });

            }

            res.status(201).json({

                message:
                    "Scheme added successfully",

                id:
                    result.insertId

            });

        }
    );

});

app.put("/api/schemes/:id", (req, res) => {

    const {
        id
    } = req.params;

    const {
        name,
        category,
        department,
        state,
        beneficiary,
        type,
        short_description,
        about,
        benefits,
        eligibility,
        documents,
        process,
        official
    } = req.body;

    if (!name || !category) {

        return res.status(400).json({
            error:
                "Scheme name and category are required"
        });

    }

    const sql = `
        UPDATE schemes
        SET
            name = ?,
            category = ?,
            department = ?,
            state = ?,
            beneficiary = ?,
            type = ?,
            short_description = ?,
            about = ?,
            benefits = ?,
            eligibility = ?,
            documents = ?,
            process = ?,
            official = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    const values = [
        name,
        category,
        department || "",
        state || "",
        beneficiary || "",
        type || "",
        short_description || "",
        about || "",
        benefits || "",
        eligibility || "",
        documents || "",
        process || "",
        official || "",
        id
    ];

    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {

                console.error(
                    "UPDATE SCHEME ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Scheme update failed"
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    error:
                        "Scheme not found"
                });

            }

            res.json({

                message:
                    "Scheme updated successfully"

            });

        }
    );

});

app.delete("/api/schemes/:id", (req, res) => {

    const {
        id
    } = req.params;

    const sql = `
        DELETE FROM schemes
        WHERE id = ?
    `;

    db.query(
        sql,
        [id],
        (err, result) => {

            if (err) {

                console.error(
                    "DELETE SCHEME ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Scheme delete failed"
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    error:
                        "Scheme not found"
                });

            }

            res.json({

                message:
                    "Scheme deleted successfully"

            });

        }
    );

});

app.get("/api/updates", (req, res) => {

    const sql = `
        SELECT *
        FROM updates
        ORDER BY created_at DESC
    `;

    db.query(
        sql,
        (err, results) => {

            if (err) {

                console.error(
                    "GET UPDATES ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Updates database error"
                });

            }

            res.json(results);

        }
    );

});

app.get("/api/updates/:id", (req, res) => {

    const {
        id
    } = req.params;

    const sql = `
        SELECT *
        FROM updates
        WHERE id = ?
    `;

    db.query(
        sql,
        [id],
        (err, results) => {

            if (err) {

                console.error(
                    "GET SINGLE UPDATE ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Database error"
                });

            }

            if (results.length === 0) {

                return res.status(404).json({
                    error:
                        "Update not found"
                });

            }

            res.json(results[0]);

        }
    );

});

app.post("/api/updates", (req, res) => {

    const {
        title,
        description,
        update_type,
        link
    } = req.body;

    if (!title) {

        return res.status(400).json({
            error:
                "Update title is required"
        });

    }

    const sql = `
        INSERT INTO updates
        (
            title,
            description,
            update_type,
            link
        )
        VALUES (?, ?, ?, ?)
    `;

    const values = [
        title,
        description || "",
        update_type || "सामान्य",
        link || "#"
    ];

    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {

                console.error(
                    "ADD UPDATE ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Update add failed"
                });

            }

            res.status(201).json({

                message:
                    "Update added successfully",

                id:
                    result.insertId

            });

        }
    );

});

app.put("/api/updates/:id", (req, res) => {

    const {
        id
    } = req.params;

    const {
        title,
        description,
        update_type,
        link
    } = req.body;

    if (!title) {

        return res.status(400).json({
            error:
                "Update title is required"
        });

    }

    const sql = `
        UPDATE updates
        SET
            title = ?,
            description = ?,
            update_type = ?,
            link = ?
        WHERE id = ?
    `;

    const values = [
        title,
        description || "",
        update_type || "सामान्य",
        link || "#",
        id
    ];

    db.query(
        sql,
        values,
        (err, result) => {

            if (err) {

                console.error(
                    "EDIT UPDATE ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Update edit failed"
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    error:
                        "Update not found"
                });

            }

            res.json({

                message:
                    "Update updated successfully"

            });

        }
    );

});

app.delete("/api/updates/:id", (req, res) => {

    const {
        id
    } = req.params;

    const sql = `
        DELETE FROM updates
        WHERE id = ?
    `;

    db.query(
        sql,
        [id],
        (err, result) => {

            if (err) {

                console.error(
                    "DELETE UPDATE ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Update delete failed"
                });

            }

            if (result.affectedRows === 0) {

                return res.status(404).json({
                    error:
                        "Update not found"
                });

            }

            res.json({

                message:
                    "Update deleted successfully"

            });

        }
    );

});

const PORT =
    process.env.PORT || 5000;
app.get("/api/notifications", (req, res) => {

    const sql = `
        SELECT *
        FROM notifications
        WHERE user_id IS NULL
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {
            console.error("GET NOTIFICATIONS ERROR:", err);

            return res.status(500).json({
                error: "Notifications fetch failed"
            });
        }

        res.json(results);
    });
});
app.post("/api/notifications", (req, res) => {

    const {
        title,
        message,
        type,
        scheme_id,
        user_id
    } = req.body;

    if (!title || !message) {

        return res.status(400).json({
            error: "Title and message are required"
        });
    }

    const sql = `
        INSERT INTO notifications
        (
            title,
            message,
            type,
            scheme_id,
            user_id
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
        title,
        message,
        type || "general",
        scheme_id || null,
        user_id || null
    ];

    db.query(sql, values, (err, result) => {

        if (err) {

            console.error(
                "CREATE NOTIFICATION ERROR:",
                err
            );

            return res.status(500).json({
                error: "Notification create failed"
            });
        }

        const notification = {
            id: result.insertId,
            title,
            message,
            type: type || "general",
            scheme_id: scheme_id || null,
            user_id: user_id || null
        };
        if (user_id) {

            io.to(`user_${user_id}`).emit(
                "newNotification",
                notification
            );

        } else {

            io.emit(
                "newNotification",
                notification
            );

        }

        res.status(201).json({

            message: "Notification created successfully",

            id: result.insertId

        });

    });

});

app.get("/api/contacts", (req, res) => {

    const sql = `
        SELECT *
        FROM contacts
        ORDER BY created_at DESC
    `;

    db.query(
        sql,
        (err, results) => {

            if (err) {

                console.error(
                    "CONTACT GET ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Messages fetch failed"
                });

            }

            res.json(results);

        }
    );

});

app.post("/api/contacts", (req, res) => {

    const {
        name,
        email,
        mobile,
        subject,
        message
    } = req.body;

    if (!name || !message) {

        return res.status(400).json({
            error:
                "Name and message are required"
        });

    }

    const sql = `
        INSERT INTO contacts
        (name, email, mobile, subject, message)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            name,
            email || "",
            mobile || "",
            subject || "",
            message
        ],
        (err, result) => {

            if (err) {

                console.error(
                    "CONTACT POST ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Message save failed"
                });

            }

            res.status(201).json({

                message:
                    "Message sent successfully",

                id:
                    result.insertId

            });

        }
    );

});

app.put("/api/contacts/:id/status", (req, res) => {

    const {
        status
    } = req.body;

    if (
        status !== "Read" &&
        status !== "Unread"
    ) {

        return res.status(400).json({
            error:
                "Invalid status"
        });

    }

    const sql = `
        UPDATE contacts
        SET status = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [status, req.params.id],
        (err) => {

            if (err) {

                console.error(
                    "CONTACT STATUS ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Status update failed"
                });

            }

            res.json({

                message:
                    "Status updated successfully"

            });

        }
    );

});

app.delete("/api/contacts/:id", (req, res) => {

    const sql = `
        DELETE FROM contacts
        WHERE id = ?
    `;

    db.query(
        sql,
        [req.params.id],
        (err) => {

            if (err) {

                console.error(
                    "CONTACT DELETE ERROR:",
                    err
                );

                return res.status(500).json({
                    error:
                        "Message delete failed"
                });

            }

            res.json({

                message:
                    "Message deleted successfully"

            });

        }
    );

});

io.on("connection", (socket) => {

    console.log("🔔 User connected:", socket.id);

    socket.on("joinUser", (userId) => {

        if (userId) {

            socket.join(`user_${userId}`);

            console.log(
                `👤 User ${userId} joined notification room`
            );

        }

    });

    socket.on("disconnect", () => {

        console.log(
            "❌ User disconnected:",
            socket.id
        );

    });

});

app.post("/api/ai/benefit-optimizer", async (req, res) => {
    try {
        const { user, scheme } = req.body;

        if (!user || !scheme) {
            return res.status(400).json({
                success: false,
                message: "User आणि scheme माहिती आवश्यक आहे."
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: "Gemini API key सापडली नाही."
            });
        }

        const prompt = `
तुम्ही JanSaarthi चे AI Benefit Optimizer आहात.

खाली user profile आणि सरकारी योजनेची माहिती दिली आहे.

USER PROFILE:
${JSON.stringify(user, null, 2)}

SCHEME:
${JSON.stringify(scheme, null, 2)}

या user साठी या योजनेचा संभाव्य फायदा कसा जास्तीत जास्त मिळवता येईल याचे विश्लेषण करा.

महत्त्वाचे:
- योजनेच्या दिलेल्या माहितीबाहेर खोटी रक्कम किंवा लाभ तयार करू नका.
- लाभाची रक्कम स्पष्टपणे उपलब्ध नसल्यास "माहिती उपलब्ध नाही" असे सांगा.
- पात्रता निश्चित नसल्यास "अंतिम पात्रता संबंधित विभाग तपासेल" असे सांगा.
- उत्तर सोप्या मराठीत द्या.

फक्त खालील JSON format मध्ये उत्तर द्या:

{
  "schemeName": "योजनेचे नाव",
  "benefitPotential": "उच्च / मध्यम / कमी / माहिती उपलब्ध नाही",
  "estimatedBenefits": [
    "उपलब्ध असलेला संभाव्य लाभ"
  ],
  "whyEligible": [
    "user profile शी जुळणारे कारण"
  ],
  "howToMaximize": [
    "लाभ जास्तीत जास्त मिळवण्यासाठी कृती"
  ],
  "requiredActions": [
    "करावयाची कृती"
  ],
  "requiredDocuments": [
    "आवश्यक कागदपत्र"
  ],
  "warnings": [
    "महत्त्वाची सूचना"
  ],
  "practicalTips": [
    "उपयुक्त टिप"
  ]
}

फक्त valid JSON द्या. Markdown किंवा extra text देऊ नका.
`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + apiKey,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        const rawResponse = await response.text();

        let data = {};

        try {
            data = rawResponse ? JSON.parse(rawResponse) : {};
        } catch (jsonError) {
            console.error("Benefit Optimizer NON-JSON RESPONSE:", rawResponse);
            return res.status(502).json({
                success: false,
                message: "Gemini कडून valid JSON response मिळाला नाही."
            });
        }

        if (!response.ok) {
            console.error("Benefit Optimizer Gemini Error:", data);

            return res.status(500).json({
                success: false,
                message: "AI Benefit Optimizer error आला."
            });
        }

        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            return res.status(500).json({
                success: false,
                message: "AI कडून response मिळाला नाही."
            });
        }

        let result;

        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error("Benefit Optimizer JSON Error:", text);

            return res.status(500).json({
                success: false,
                message: "AI response योग्य format मध्ये नाही."
            });
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Benefit Optimizer Error:", error);

        if (res.headersSent) {
            return;
        }

        return res.status(500).json({
            success: false,
            message: error.message || "Benefit Optimizer चालू करताना error आला."
        });
    }
});


app.post("/api/ai/document-checker", upload.single("document"), async (req, res) => {

    

});

// ======================================================
// 👥 ADMIN - USERS MANAGEMENT
// ======================================================

// GET ALL USERS
app.get("/api/admin/users", (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      mobile,
      age,
      gender,
      state,
      district,
      area_type,
      caste,
      category,
      occupation,
      income
    FROM users
    ORDER BY id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("ADMIN USERS ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Users load झाले नाहीत.",
        error: err.code || "DATABASE_ERROR"
      });
    }

    res.json(results);
  });
});


// GET SINGLE USER
app.get("/api/admin/users/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID."
    });
  }

  const sql = `
    SELECT
      id,
      name,
      mobile,
      age,
      gender,
      state,
      district,
      area_type,
      caste,
      category,
      occupation,
      income
    FROM users
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("USER DETAILS ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "User details मिळाले नाहीत.",
        error: err.code || "DATABASE_ERROR"
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User सापडला नाही."
      });
    }

    res.json(results[0]);
  });
});


// DELETE USER
app.delete("/api/admin/users/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID."
    });
  }

  db.query(
    "DELETE FROM users WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("DELETE USER ERROR:", err);

        return res.status(500).json({
          success: false,
          message: "User delete करता आला नाही.",
          error: err.code || "DATABASE_ERROR"
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "User सापडला नाही."
        });
      }

      res.json({
        success: true,
        message: "User delete झाला."
      });
    }
  );
});
// ==========================================
// ADMIN - USERS MANAGEMENT
// ==========================================

// GET ALL USERS
app.get("/api/admin/users", (req, res) => {
    console.log("🔥 ADMIN USERS API CALLED");

    const sql = `
        SELECT
            id,
            name,
            mobile,
            age,
            gender,
            state,
            district,
            area_type,
            caste,
            occupation,
            income
        FROM users
        ORDER BY id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("❌ ADMIN USERS ERROR:", err);

            return res.status(500).json({
                success: false,
                message: "Users load झाले नाहीत.",
                error: err.sqlMessage || err.message
            });
        }

        console.log("✅ USERS LOADED:", results.length);

        // admin.js ला array पाहिजे
        res.json(results);
    });
});


// GET SINGLE USER
app.get("/api/admin/users/:id", (req, res) => {

    const userId = req.params.id;

    const sql = `
        SELECT
            id,
            name,
            mobile,
            age,
            gender,
            state,
            district,
            area_type,
            caste,
            occupation,
            income
        FROM users
        WHERE id = ?
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            console.error("❌ SINGLE USER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: "User details मिळाल्या नाहीत.",
                error: err.sqlMessage || err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User सापडला नाही."
            });
        }

        res.json(results[0]);
    });
});


// DELETE USER
app.delete("/api/admin/users/:id", (req, res) => {

    const userId = req.params.id;

    const sql = "DELETE FROM users WHERE id = ?";

    db.query(sql, [userId], (err, result) => {

        if (err) {
            console.error("❌ DELETE USER ERROR:", err);

            return res.status(500).json({
                success: false,
                message: "User delete करता आला नाही.",
                error: err.sqlMessage || err.message
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "User सापडला नाही."
            });
        }

        console.log("🗑️ USER DELETED:", userId);

        res.json({
            success: true,
            message: "User successfully delete झाला."
        });
    });
});

app.post("/api/ai/chat", async (req, res) => {

    try {

        const { message, user } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                error: "कृपया तुमचा प्रश्न लिहा."
            });
        }


        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Gemini API key सापडली नाही."
            });
        }

        const userProfile = user || {};
        const sql = `
            SELECT
                id,
                name,
                category,
                department,
                state,
                beneficiary,
                type,
                short_description,
                about,
                benefits,
                eligibility,
                documents,
                process,
                official
            FROM schemes
            ORDER BY updated_at DESC
        `;

        db.query(sql, async (err, schemes) => {

            if (err) {

                console.error(
                    "CHATBOT SCHEME DATABASE ERROR:",
                    err
                );

                return res.status(500).json({
                    error: "योजनांची माहिती मिळवता आली नाही."
                });

            }

            try {

                const schemeData = schemes.map(scheme => ({
                    id: scheme.id,
                    name: scheme.name,
                    category: scheme.category,
                    department: scheme.department,
                    state: scheme.state,
                    beneficiary: scheme.beneficiary,
                    type: scheme.type,
                    description: scheme.short_description,
                    about: scheme.about,
                    benefits: scheme.benefits,
                    eligibility: scheme.eligibility,
                    documents: scheme.documents,
                    process: scheme.process,
                    official: scheme.official
                }));


                const prompt = `
तुम्ही "जनसारथी" या सरकारी योजना माहिती पोर्टलचे AI सहाय्यक आहात.

तुमचे काम वापरकर्त्याला सरकारी योजनांबद्दल
सोप्या आणि स्पष्ट मराठी भाषेत माहिती देणे आहे.

वापरकर्त्याची माहिती:

नाव: ${userProfile.name || "माहिती नाही"}
वय: ${userProfile.age || "माहिती नाही"}
व्यवसाय: ${userProfile.occupation || "माहिती नाही"}
उत्पन्न: ${userProfile.income || "माहिती नाही"}
राज्य: ${userProfile.state || "माहिती नाही"}
जिल्हा: ${userProfile.district || "माहिती नाही"}
प्रवर्ग: ${userProfile.category || "माहिती नाही"}

वापरकर्त्याचा प्रश्न:

${message}

जनसारथीच्या डेटाबेसमधील उपलब्ध योजना:

${JSON.stringify(schemeData)}

नियम:

1. शक्यतो मराठीत उत्तर द्या.
2. वापरकर्त्याच्या प्रश्नानुसार योग्य योजना शोधा.
3. डेटाबेसमध्ये माहिती उपलब्ध नसेल तर ती बनवून सांगू नका.
4. पात्रता निश्चित आहे असे सांगू नका; उपलब्ध माहितीनुसार "संभाव्य पात्रता" असे स्पष्ट करा.
5. लाभ, कागदपत्रे आणि अर्ज प्रक्रिया डेटाबेसमधील माहितीनुसार सांगा.
6. शक्य असल्यास योजनेचे नाव स्पष्टपणे द्या.
7. उत्तर सोपे, नैसर्गिक आणि उपयोगी ठेवा.
8. वापरकर्त्याच्या प्रोफाइलचा संदर्भ प्रश्नाला उपयोगी असल्यास घ्या.
9. सरकारी योजनेची अधिकृत माहिती तपासण्यासाठी official link उपलब्ध असल्यास त्याचा उल्लेख करा.
10. अनावश्यक मोठे उत्तर देऊ नका.
`;


                const response = await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + apiKey,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: prompt
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                );

                const rawResponse = await response.text();

                let data = {};

                try {
                    data = rawResponse ? JSON.parse(rawResponse) : {};
                } catch (jsonError) {
                    console.error("CHATBOT NON-JSON RESPONSE:", rawResponse);
                    return res.status(502).json({
                        success: false,
                        error: "Gemini कडून valid JSON response मिळाला नाही."
                    });
                }

                if (!response.ok) {

                    console.error(
                        "GEMINI API ERROR:",
                        data
                    );

                    return res.status(500).json({
                        error:
                            "AI सेवा सध्या उपलब्ध नाही."
                    });

                }

                const aiReply =
                    data?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!aiReply) {

                    return res.status(500).json({
                        error:
                            "AI कडून उत्तर मिळाले नाही."
                    });

                }

                res.json({
                    success: true,
                    reply: aiReply
                });

            } catch (aiError) {

                console.error(
                    "CHATBOT AI ERROR:",
                    aiError
                );

                if (res.headersSent) {
                    return;
                }

                return res.status(500).json({
                    error:
                        "AI chatbot मध्ये अडचण आली."
                });

            }

        });

    } catch (error) {

        console.error(
            "CHATBOT API ERROR:",
            error
        );

        if (res.headersSent) {
            return;
        }

        return res.status(500).json({
            error:
                error.message ||
                "Chatbot server error."
        });

    }

});

app.post("/api/ai/recommendations", async (req, res) => {

    try {

        const {
            name,
            age,
            occupation,
            income,
            state,
            district,
            category
        } = req.body;

        if (
            !age ||
            !occupation ||
            !income ||
            !state ||
            !district ||
            !category
        ) {
            return res.status(400).json({
                error: "User profile information is incomplete."
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Gemini API key सापडली नाही."
            });
        }

        const sql = `
            SELECT
                id,
                name,
                category,
                department,
                state,
                beneficiary,
                type,
                short_description,
                about,
                benefits,
                eligibility,
                documents,
                process,
                official
            FROM schemes
            ORDER BY updated_at DESC
        `;

        db.query(sql, async (err, schemes) => {

            if (err) {

                console.error(
                    "AI SCHEME DATABASE ERROR:",
                    err
                );

                return res.status(500).json({
                    error: "Schemes database error."
                });
            }

            if (!schemes || schemes.length === 0) {

                return res.status(404).json({
                    error: "No schemes available."
                });
            }

            try {


                const profile = {
                    name: name || "",
                    age: age,
                    occupation: occupation,
                    income: income,
                    state: state,
                    district: district,
                    category: category
                };


                const schemeData = schemes.map(scheme => ({

                    id: scheme.id,

                    name: scheme.name,

                    category: scheme.category,

                    department: scheme.department,

                    state: scheme.state,

                    beneficiary: scheme.beneficiary,

                    type: scheme.type,

                    description:
                        scheme.short_description,

                    benefits:
                        scheme.benefits,

                    eligibility:
                        scheme.eligibility,

                    documents:
                        scheme.documents,

                    process:
                        scheme.process,

                    official:
                        scheme.official

                }));

                const prompt = `
तुम्ही "जनसारथी" सरकारी योजना पोर्टलचे
AI Scheme Recommendation Expert आहात.

खाली वापरकर्त्याची profile माहिती आणि
database मधील सरकारी योजनांची माहिती दिली आहे.

USER PROFILE:

${JSON.stringify(profile, null, 2)}

AVAILABLE GOVERNMENT SCHEMES:

${JSON.stringify(schemeData, null, 2)}


तुमचे काम:

1. वापरकर्त्याच्या profile चे सखोल विश्लेषण करा.

2. वय, व्यवसाय, उत्पन्न, राज्य, जिल्हा आणि प्रवर्ग
यांचा विचार करा.

3. वापरकर्त्यासाठी योग्य असलेल्या
अनेक सरकारी योजना शोधा.

4. फक्त एका योजनेपुरते मर्यादित राहू नका.

5. शक्य असल्यास 3 ते 6 सर्वात योग्य योजना द्या.

6. प्रत्येक योजनेसाठी:
   - योजना का योग्य आहे
   - कोणता profile factor match झाला
   - संभाव्य पात्रता
   - मुख्य लाभ
   हे थोडक्यात सांगा.

7. Database मध्ये नसलेली योजना तयार करू नका.

8. पात्रता निश्चित असल्याचे सांगू नका.
   "उपलब्ध माहितीनुसार संभाव्य पात्रता" असे सांगा.

9. योजना निवडताना profile शी वास्तविक relevance
सर्वात महत्त्वाची आहे.

10. उत्तर मराठीत द्या.

11. JSON format मध्येच उत्तर द्या.

JSON FORMAT:

{
  "profileAnalysis": {
    "summary": "थोडक्यात profile analysis",
    "strengths": ["...", "..."],
    "importantFactors": ["...", "..."]
  },
  "recommendations": [
    {
      "id": 1,
      "name": "योजनेचे नाव",
      "matchScore": 95,
      "matchReason": "ही योजना का योग्य आहे",
      "eligibilitySummary": "संभाव्य पात्रता",
      "benefitsSummary": "मुख्य लाभ"
    }
  ]
}

फक्त valid JSON द्या.
JSON च्या बाहेर कोणताही मजकूर देऊ नका.
id हा database मधील actual scheme id असावा.
matchScore 0 ते 100 मध्ये असावा.
recommendations मध्ये जास्तीत जास्त 6 योजना द्या.
recommendations relevance नुसार descending order मध्ये द्या.
profileAnalysis आणि recommendations database मधील माहितीवर आधारित असावेत.
profileAnalysis किंवा recommendation मध्ये तथ्य बनवू नका.
recommendations मध्ये match नसलेली योजना देऊ नका.
matchScore कमी असेल तर त्या योजनेला recommendation मध्ये देऊ नका.
official link उपलब्ध असल्यास त्याचा उपयोग scheme ओळखण्यासाठी करा.
official link स्वतःहून बनवू नका.
matchReason आणि बाकी मजकूर मराठीत द्या.
name scheme database मधील actual name असावा.
id scheme database मधील actual id असावा.
matchScore हा AI relevance score आहे.
matchScore 70 पेक्षा कमी असल्यास शक्यतो recommendation देऊ नका.
recommendations रिकामी असल्यास रिकामी array द्या.
profileAnalysis.summary मध्ये profile चे साधे आणि उपयोगी विश्लेषण द्या.
importantFactors मध्ये recommendation साठी महत्त्वाचे profile factors द्या.
strengths मध्ये profile मधील योजनांसाठी उपयोगी असलेले factors द्या.
eligibilitySummary मध्ये "संभाव्य" हा शब्द वापरा.
benefitsSummary database मधील benefits वर आधारित असावा.
matchReason database आणि profile वर आधारित असावा.
id आणि name database मधूनच घ्या.
recommendations मध्ये duplicate योजना देऊ नका.
recommendations relevance नुसार sort करा.
recommendations मध्ये फक्त उपलब्ध database schemes वापरा.
profileAnalysis concise ठेवा.
recommendations concise ठेवा.
matchReason concise ठेवा.
eligibilitySummary concise ठेवा.
benefitsSummary concise ठेवा.
JSON valid असणे आवश्यक आहे.
markdown वापरू नका.
code fence वापरू नका.
comments वापरू नका.
trailing comma वापरू नका.
double quotes वापरा.
NaN, undefined, null वापरू नका.
recommendations मध्ये maximum 6 objects असावेत.
matchScore integer असावा.
id integer असावा.
profileAnalysis object असावा.
recommendations array असावा.
summary, strengths, importantFactors ही fields असावीत.
name, matchScore, matchReason,
eligibilitySummary, benefitsSummary
ही recommendation fields असावीत.
id actual database id असावा.
`;

                const response = await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
                    apiKey,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({

                            contents: [
                                {
                                    parts: [
                                        {
                                            text: prompt
                                        }
                                    ]
                                }
                            ],

                            generationConfig: {
                                temperature: 0.2,
                                responseMimeType:
                                    "application/json"
                            }

                        })
                    }
                );


                const rawResponse = await response.text();

                let data = {};

                try {
                    data = rawResponse ? JSON.parse(rawResponse) : {};
                } catch (jsonError) {
                    console.error("GEMINI RECOMMENDATION NON-JSON RESPONSE:", rawResponse);

                    if (!res.headersSent) {
                        return res.status(502).json({
                            success: false,
                            error: "Gemini कडून valid JSON response मिळाला नाही."
                        });
                    }

                    return;
                }

                if (!response.ok) {
                    console.error(
                        "GEMINI RECOMMENDATION ERROR:",
                        data
                    );

                    const statusCode = response.status === 429 || response.status === 503
                        ? response.status
                        : 500;

                    if (!res.headersSent) {
                        return res.status(statusCode).json({
                            success: false,
                            error:
                                data?.error?.message ||
                                "Gemini AI सध्या उपलब्ध नाही. कृपया काही वेळाने पुन्हा प्रयत्न करा."
                        });
                    }

                    return;
                }


                const aiText =
                    data?.candidates?.[0]
                        ?.content?.parts?.[0]?.text;


                if (!aiText) {

                    return res.status(502).json({
                        success: false,
                        error:
                            "AI कडून recommendation मिळाले नाही."
                    });
                }

                let aiResult;

try {

    let cleanText = aiText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const start = cleanText.indexOf("{");
    const end = cleanText.lastIndexOf("}");

    if (start === -1 || end === -1) {
        throw new Error("AI ने valid JSON दिला नाही.");
    }

    cleanText = cleanText.substring(
        start,
        end + 1
    );

    aiResult = JSON.parse(cleanText);

} catch (parseError) {

    console.error(
        "AI JSON PARSE ERROR:",
        aiText
    );

    return res.status(500).json({
        success: false,
        error:
            "AI response format चुकीचा आहे."
    });
}
            
                return res.json({

                    success: true,

                    profileAnalysis:
                        aiResult.profileAnalysis || {
                            summary: "",
                            strengths: [],
                            importantFactors: []
                        },

                    recommendations:
                        Array.isArray(
                            aiResult.recommendations
                        )
                            ? aiResult.recommendations
                            : []

                });

            } catch (aiError) {

    console.error(
        "AI RECOMMENDATION ERROR:",
        aiError
    );

    if (res.headersSent) {
        return;
    }

    return res.status(500).json({
        success: false,
        error:
            aiError.message ||
            "AI recommendation failed."
    });
}

        });

} catch (error) {

    console.error(
        "AI API ERROR:",
        error
    );

    if (res.headersSent) {
        return;
    }

    return res.status(500).json({
        success: false,
        error:
            error.message ||
            "AI server error."
    });
}
});

app.post("/api/ai/compare-schemes", async (req, res) => {

    try {

        const { schemes, user } = req.body;

        if (!Array.isArray(schemes) || schemes.length < 2) {

            return res.status(400).json({
                success: false,
                error: "तुलनेसाठी किमान 2 योजना आवश्यक आहेत."
            });

        }

        if (schemes.length > 3) {

            return res.status(400).json({
                success: false,
                error: "जास्तीत जास्त 3 योजनांची तुलना करता येईल."
            });

        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {

            return res.status(500).json({
                success: false,
                error: "Gemini API key सापडली नाही."
            });

        }

        const userProfile = user || {};

        const schemeData = schemes.map((scheme) => ({

            id: scheme.id,
            name: scheme.name,
            category: scheme.category,
            department: scheme.department,
            state: scheme.state,
            beneficiary: scheme.beneficiary,
            type: scheme.type,
            short_description: scheme.short_description,
            about: scheme.about,
            benefits: scheme.benefits,
            eligibility: scheme.eligibility,
            documents: scheme.documents,
            process: scheme.process,
            official: scheme.official

        }));

        const prompt = `

तुम्ही "जनसारथी" सरकारी योजना पोर्टलचे
AI Scheme Comparison Expert आहात.

तुमचे काम वापरकर्त्याने निवडलेल्या सरकारी योजनांची
सोप्या मराठीत तुलना करणे आहे.

USER PROFILE:

${JSON.stringify(userProfile, null, 2)}

SELECTED GOVERNMENT SCHEMES:

${JSON.stringify(schemeData, null, 2)}

महत्त्वाचे नियम:

1. फक्त दिलेल्या database scheme information वर आधारित तुलना करा.

2. कोणतीही नवीन योजना किंवा माहिती स्वतःहून तयार करू नका.

3. लाभाची रक्कम database मध्ये नसेल तर रक्कम बनवू नका.

4. पात्रता निश्चित आहे असे सांगू नका.
   "संभाव्य पात्रता" असा उल्लेख करा.

5. User profile उपलब्ध असल्यास:
   - वय
   - व्यवसाय
   - उत्पन्न
   - राज्य
   - जिल्हा
   - प्रवर्ग
   यांचा विचार करा.

6. प्रत्येक योजनेची:
   - पात्रता
   - फायदे
   - कागदपत्रे
   - अर्ज प्रक्रिया
   - user relevance
   यांची तुलना करा.

7. कोणती योजना user साठी जास्त योग्य आहे ते स्पष्ट करा.

8. Match score 0 ते 100 मध्ये द्या.

9. Score हा database information आणि user profile वर आधारित relevance score असावा.

10. Database मध्ये माहिती नसल्यास:
    "माहिती उपलब्ध नाही" असे लिहा.

11. उत्तर सोप्या आणि स्पष्ट मराठीत द्या.

12. फक्त valid JSON द्या.

JSON FORMAT:

{
    "comparison": [
        {
            "id": 1,
            "name": "योजनेचे नाव",
            "matchScore": 90,
            "eligibility": "संभाव्य पात्रता",
            "benefits": "मुख्य फायदे",
            "documents": "आवश्यक कागदपत्रे",
            "process": "अर्ज प्रक्रिया",
            "userRelevance": "User साठी ही योजना किती योग्य आहे"
        }
    ],
    "bestScheme": {
        "id": 1,
        "name": "सर्वात योग्य योजनेचे नाव",
        "reason": "ही योजना सर्वात योग्य का आहे"
    },
    "overallAnalysis": "सर्व योजनांची थोडक्यात तुलना",
    "importantNote": "अंतिम पात्रता संबंधित विभागाच्या नियमांनुसार तपासली जाईल."
}

महत्त्वाचे:

- comparison मध्ये निवडलेल्या सर्व योजनांचा समावेश करा.
- duplicate योजना देऊ नका.
- id हा database मधील actual id असावा.
- name हा database मधील actual name असावा.
- matchScore integer असावा.
- comparison array असावा.
- bestScheme object असावा.
- bestScheme मधील id आणि name निवडलेल्या योजनांमधूनच असावा.
- JSON च्या बाहेर कोणताही मजकूर देऊ नका.
- Markdown वापरू नका.
- code fence वापरू नका.
- trailing comma वापरू नका.

`;

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
            apiKey,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],

                    generationConfig: {
                        temperature: 0.2,
                        responseMimeType: "application/json"
                    }

                })
            }
        );

        const rawResponse = await response.text();

        let data = {};

        try {
            data = rawResponse ? JSON.parse(rawResponse) : {};
        } catch (jsonError) {
            console.error(
                "AI COMPARISON NON-JSON RESPONSE:",
                rawResponse
            );

            return res.status(502).json({
                success: false,
                error: "Gemini कडून valid JSON response मिळाला नाही."
            });
        }

        if (!response.ok) {

            console.error(
                "AI COMPARISON GEMINI ERROR:",
                data
            );

            return res.status(response.status === 429 || response.status === 503 ? response.status : 500).json({
                success: false,
                error:
                    data?.error?.message ||
                    "AI Scheme Comparison सध्या उपलब्ध नाही. कृपया पुन्हा प्रयत्न करा."
            });

        }

        const aiText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiText) {

            return res.status(500).json({
                success: false,
                error: "AI कडून comparison response मिळाला नाही."
            });

        }

       let result;

try {

    let cleanText = aiText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const start = cleanText.indexOf("{");
    const end = cleanText.lastIndexOf("}");

    if (start === -1 || end === -1) {
        throw new Error("AI ने valid JSON दिला नाही.");
    }

    cleanText = cleanText.substring(
        start,
        end + 1
    );

    result = JSON.parse(cleanText);

} catch (parseError) {

    console.error(
        "AI COMPARISON JSON ERROR:",
        aiText
    );

    return res.status(500).json({
        success: false,
        error:
            "AI comparison response योग्य JSON format मध्ये नाही."
    });
}

        return res.json({

            success: true,

            comparison:
                Array.isArray(result.comparison)
                    ? result.comparison
                    : [],

            bestScheme:
                result.bestScheme || null,

            overallAnalysis:
                result.overallAnalysis || "",

            importantNote:
                result.importantNote ||
                "अंतिम पात्रता संबंधित विभागाच्या नियमांनुसार तपासली जाईल."

        });

    } catch (error) {

        console.error(
            "AI SCHEME COMPARISON ERROR:",
            error
        );

        if (res.headersSent) {
            return;
        }

        return res.status(500).json({

            success: false,

            error:
                error.message ||
                "AI Scheme Comparison चालू करताना error आला."

        });

    }

});
// ==========================================================
// 🧠 JANSAARTHI AI LIFE SCHEME
// ==========================================================

app.post("/api/ai/life-scheme", async (req, res) => {

    try {

        const { event, user } = req.body;

        if (!event) {
            return res.status(400).json({
                success: false,
                message: "Life event आवश्यक आहे."
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: "Gemini API key सापडली नाही."
            });
        }

        const userProfile = user || {};

        const sql = `
            SELECT
                id,
                name,
                category,
                department,
                state,
                beneficiary,
                type,
                short_description,
                about,
                benefits,
                eligibility,
                documents,
                process,
                official
            FROM schemes
            ORDER BY updated_at DESC
        `;

        db.query(sql, async (err, schemes) => {

            if (err) {

                console.error(
                    "LIFE SCHEME DATABASE ERROR:",
                    err
                );

                return res.status(500).json({
                    success: false,
                    message: "योजनांची माहिती मिळवता आली नाही."
                });
            }

            try {

                const schemeData = schemes.map(scheme => ({
                    id: scheme.id,
                    name: scheme.name,
                    category: scheme.category,
                    department: scheme.department,
                    state: scheme.state,
                    beneficiary: scheme.beneficiary,
                    type: scheme.type,
                    description: scheme.short_description,
                    about: scheme.about,
                    benefits: scheme.benefits,
                    eligibility: scheme.eligibility,
                    documents: scheme.documents,
                    process: scheme.process,
                    official: scheme.official
                }));

                const prompt = `
तुम्ही "जनसारथी" सरकारी योजना पोर्टलचे
AI Life Scheme Assistant आहात.

तुमचे काम वापरकर्त्याच्या सध्याच्या जीवनातील
परिस्थितीनुसार database मधील संबंधित सरकारी योजना शोधणे आहे.

USER PROFILE:

${JSON.stringify(userProfile, null, 2)}

CURRENT LIFE EVENT:

${event}

DATABASE GOVERNMENT SCHEMES:

${JSON.stringify(schemeData, null, 2)}

महत्त्वाचे नियम:

1. फक्त database मधील योजनांचा वापर करा.
2. database मध्ये नसलेली योजना तयार करू नका.
3. User च्या life event शी संबंधित योजना शोधा.
4. User profile उपलब्ध असल्यास त्याचा विचार करा.
5. वय, व्यवसाय, उत्पन्न, राज्य, जिल्हा आणि प्रवर्ग यांचा विचार करा.
6. जास्तीत जास्त 6 संबंधित योजना द्या.
7. प्रत्येक योजनेसाठी:
   - योजना का संबंधित आहे
   - संभाव्य पात्रता
   - मुख्य लाभ
   - आवश्यक कागदपत्रे
   - अर्ज प्रक्रिया
8. पात्रता निश्चित आहे असे सांगू नका.
9. "संभाव्य पात्रता" असा उल्लेख करा.
10. Database मध्ये माहिती उपलब्ध नसेल तर "माहिती उपलब्ध नाही" लिहा.
11. Official link database मध्ये असेल तरच द्या.
12. Official link स्वतःहून बनवू नका.
13. उत्तर सोप्या मराठीत द्या.
14. फक्त valid JSON द्या.

JSON FORMAT:

{
    "event": "${event}",
    "summary": "या परिस्थितीसाठी थोडक्यात मार्गदर्शन",
    "recommendations": [
        {
            "id": 1,
            "name": "योजनेचे नाव",
            "matchScore": 90,
            "whyRelevant": "ही योजना या परिस्थितीसाठी का संबंधित आहे",
            "eligibility": "संभाव्य पात्रता",
            "benefits": "मुख्य लाभ",
            "documents": "आवश्यक कागदपत्रे",
            "process": "अर्ज प्रक्रिया",
            "official": "database मधील official link"
        }
    ],
    "importantNote": "अंतिम पात्रता संबंधित सरकारी विभाग तपासेल."
}

फक्त JSON द्या.
Markdown वापरू नका.
Code fence वापरू नका.
Database बाहेरील माहिती बनवू नका.
`;

                const response = await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
                    apiKey,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        {
                                            text: prompt
                                        }
                                    ]
                                }
                            ],

                            generationConfig: {
                                temperature: 0.2,
                                responseMimeType: "application/json"
                            }
                        })
                    }
                );

                const rawResponse = await response.text();

                let data = {};

                try {
                    data = rawResponse
                        ? JSON.parse(rawResponse)
                        : {};
                } catch (error) {

                    console.error(
                        "LIFE SCHEME GEMINI NON JSON:",
                        rawResponse
                    );

                    return res.status(502).json({
                        success: false,
                        message: "Gemini कडून valid response मिळाला नाही."
                    });
                }

                if (!response.ok) {

                    console.error(
                        "LIFE SCHEME GEMINI ERROR:",
                        data
                    );

                    return res.status(
                        response.status === 429 ||
                        response.status === 503
                            ? response.status
                            : 500
                    ).json({
                        success: false,
                        message:
                            data?.error?.message ||
                            "AI Life Scheme सध्या उपलब्ध नाही."
                    });
                }

                const aiText =
                    data?.candidates?.[0]
                        ?.content?.parts?.[0]?.text;

                if (!aiText) {

                    return res.status(502).json({
                        success: false,
                        message:
                            "AI कडून Life Scheme response मिळाला नाही."
                    });
                }

                let result;

                try {

                    let cleanText = aiText
                        .replace(/```json/gi, "")
                        .replace(/```/g, "")
                        .trim();

                    const start =
                        cleanText.indexOf("{");

                    const end =
                        cleanText.lastIndexOf("}");

                    if (
                        start === -1 ||
                        end === -1
                    ) {
                        throw new Error(
                            "Invalid JSON"
                        );
                    }

                    cleanText =
                        cleanText.substring(
                            start,
                            end + 1
                        );

                    result =
                        JSON.parse(cleanText);

                } catch (error) {

                    console.error(
                        "LIFE SCHEME JSON ERROR:",
                        aiText
                    );

                    return res.status(502).json({
                        success: false,
                        message:
                            "AI Life Scheme response format चुकीचा आहे."
                    });
                }

                return res.json({

                    success: true,

                    event:
                        result.event ||
                        event,

                    summary:
                        result.summary ||
                        "",

                    recommendations:
                        Array.isArray(
                            result.recommendations
                        )
                            ? result.recommendations
                            : [],

                    importantNote:
                        result.importantNote ||
                        "अंतिम पात्रता संबंधित सरकारी विभाग तपासेल."

                });

            } catch (aiError) {

                console.error(
                    "LIFE SCHEME AI ERROR:",
                    aiError
                );

                return res.status(500).json({
                    success: false,
                    message:
                        aiError.message ||
                        "AI Life Scheme error."
                });
            }

        });

    } catch (error) {

        console.error(
            "LIFE SCHEME API ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Life Scheme server error."
        });
    }

});

// ==========================================================
// 🧪 AI LIFE SCHEME ROUTE TEST
// ==========================================================

app.get("/api/ai/life-scheme", (req, res) => {
    res.json({
        success: true,
        message: "AI Life Scheme route active. POST request वापरा."
    });
});
// ==========================================================
// 🛡️ JANSAARTHI FAKE SCHEME DETECTOR
// Text + URL + Screenshot
// ==========================================================

app.post("/api/ai/fake-scheme-detector", async (req, res) => {

    try {

        const {
            text,
            url,
            screenshot,
            user
        } = req.body;

        if (
            !text &&
            !url &&
            !screenshot
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Message, URL किंवा Screenshot आवश्यक आहे."
            });
        }

        const apiKey =
            process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message:
                    "Gemini API key सापडली नाही."
            });
        }

        // --------------------------------------------------
        // DATABASE SCHEMES
        // --------------------------------------------------

        const sql = `
            SELECT
                id,
                name,
                category,
                department,
                state,
                beneficiary,
                type,
                short_description,
                about,
                benefits,
                eligibility,
                documents,
                process,
                official
            FROM schemes
            ORDER BY updated_at DESC
        `;

        db.query(
            sql,
            async (err, schemes) => {

                if (err) {

                    console.error(
                        "FAKE DETECTOR DATABASE ERROR:",
                        err
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            "Scheme database मिळाला नाही."
                    });
                }

                try {

                    const schemeData =
                        schemes.map(
                            scheme => ({
                                id: scheme.id,
                                name: scheme.name,
                                category: scheme.category,
                                department: scheme.department,
                                state: scheme.state,
                                beneficiary: scheme.beneficiary,
                                type: scheme.type,
                                description:
                                    scheme.short_description,
                                benefits:
                                    scheme.benefits,
                                eligibility:
                                    scheme.eligibility,
                                documents:
                                    scheme.documents,
                                process:
                                    scheme.process,
                                official:
                                    scheme.official
                            })
                        );

                    const parts = [];

                    // --------------------------------------------------
                    // TEXT
                    // --------------------------------------------------

                    if (text) {

                        parts.push({
                            text:
                                `USER PROVIDED MESSAGE:\n${text}`
                        });
                    }

                    // --------------------------------------------------
                    // URL
                    // --------------------------------------------------

                    if (url) {

                        parts.push({
                            text:
                                `USER PROVIDED URL:\n${url}`
                        });
                    }

                    // --------------------------------------------------
                    // SCREENSHOT
                    // --------------------------------------------------

                    if (
                        screenshot &&
                        screenshot.base64
                    ) {

                        const mimeType =
                            screenshot.type ||
                            "image/jpeg";

                        parts.push({
                            inline_data: {
                                mime_type:
                                    mimeType,
                                data:
                                    screenshot.base64
                            }
                        });

                        parts.push({
                            text:
                                "वरील screenshot मधील मजकूर, योजना नाव, लोगो, link, फोन नंबर, पैसे मागण्याची माहिती आणि इतर दावे काळजीपूर्वक वाचा."
                        });
                    }

                    const prompt = `
तुम्ही "जनसारथी" सरकारी योजना
Fake Scheme Detector AI आहात.

तुमचे काम वापरकर्त्याला मिळालेला
सरकारी योजना message किंवा screenshot
तपासण्यात मदत करणे आहे.

USER PROFILE:

${JSON.stringify(
    user || {},
    null,
    2
)}

DATABASE GOVERNMENT SCHEMES:

${JSON.stringify(
    schemeData,
    null,
    2
)}

तपासताना खालील गोष्टी पाहा:

1. Screenshot असल्यास त्यातील text वाचा.
2. Scheme चे नाव ओळखा.
3. दिलेला benefit/claim तपासा.
4. सरकारी विभागाचे नाव तपासा.
5. URL दिल्यास त्याचे domain तपासा.
6. Database मधील योजनांशी तुलना करा.
7. Official link database मध्ये असल्यास तुलना करा.
8. पैसे, OTP, PIN, UPI, bank details किंवा registration fee मागत असल्यास स्पष्ट warning द्या.
9. "100% real" किंवा "100% fake" असा दावा करू नका.
10. पुरावा अपुरा असल्यास "माहिती अपुरी" किंवा "संशयास्पद" सांगा.
11. Database मध्ये scheme सापडली नाही म्हणून ती आपोआप fake आहे असे सांगू नका.
12. Official government source उपलब्ध असल्यास त्याचा उल्लेख करा.
13. User ला OTP, PIN, password किंवा bank details share करू नका अशी सूचना द्या.
14. Final verification साठी official government website तपासण्यास सांगा.
15. सोप्या मराठीत उत्तर द्या.
16. फक्त valid JSON द्या.

Status यापैकी एक असावा:

"संभाव्य अधिकृत"
"संशयास्पद"
"माहिती अपुरी"

JSON FORMAT:

{
    "status": "संशयास्पद",
    "riskLevel": "उच्च",
    "schemeName": "ओळखलेले योजना नाव",
    "claim": "message मध्ये केलेला दावा",
    "analysis": "AI ने केलेले विश्लेषण",
    "warningSigns": [
        "संशयास्पद बाब"
    ],
    "databaseMatch": true,
    "officialSource": "database मधील official URL",
    "recommendation": "वापरकर्त्याने काय करावे",
    "importantNote": "OTP, PIN, password किंवा bank details share करू नका."
}

महत्त्वाचे:

- तथ्य बनवू नका.
- Screenshot मधून दिसणारी माहितीच वापरा.
- Database बाहेरील scheme details स्वतःहून बनवू नका.
- Official URL database मध्ये नसेल तर स्वतः URL तयार करू नका.
- JSON च्या बाहेर कोणताही मजकूर देऊ नका.
`;

                    parts.push({
                        text: prompt
                    });

                    const response =
                        await fetch(
                            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
                            apiKey,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body: JSON.stringify({
                                    contents: [
                                        {
                                            parts
                                        }
                                    ],

                                    generationConfig: {
                                        temperature: 0.1,
                                        responseMimeType:
                                            "application/json"
                                    }
                                })
                            }
                        );

                    const rawResponse =
                        await response.text();

                    let data = {};

                    try {

                        data =
                            rawResponse
                                ? JSON.parse(
                                    rawResponse
                                )
                                : {};

                    } catch (error) {

                        console.error(
                            "FAKE DETECTOR NON JSON:",
                            rawResponse
                        );

                        return res.status(502).json({
                            success: false,
                            message:
                                "Gemini कडून valid response मिळाला नाही."
                        });
                    }

                    if (!response.ok) {

                        console.error(
                            "FAKE DETECTOR GEMINI ERROR:",
                            data
                        );

                        return res.status(
                            response.status === 429 ||
                            response.status === 503
                                ? response.status
                                : 500
                        ).json({
                            success: false,
                            message:
                                data?.error?.message ||
                                "Fake Scheme AI सध्या उपलब्ध नाही."
                        });
                    }

                    const aiText =
                        data?.candidates?.[0]
                            ?.content?.parts?.[0]?.text;

                    if (!aiText) {

                        return res.status(502).json({
                            success: false,
                            message:
                                "AI कडून verification response मिळाला नाही."
                        });
                    }

                    let result;

                    try {

                        let cleanText =
                            aiText
                                .replace(
                                    /```json/gi,
                                    ""
                                )
                                .replace(
                                    /```/g,
                                    ""
                                )
                                .trim();

                        const start =
                            cleanText.indexOf(
                                "{"
                            );

                        const end =
                            cleanText.lastIndexOf(
                                "}"
                            );

                        if (
                            start === -1 ||
                            end === -1
                        ) {
                            throw new Error(
                                "Invalid JSON"
                            );
                        }

                        cleanText =
                            cleanText.substring(
                                start,
                                end + 1
                            );

                        result =
                            JSON.parse(
                                cleanText
                            );

                    } catch (error) {

                        console.error(
                            "FAKE DETECTOR JSON ERROR:",
                            aiText
                        );

                        return res.status(502).json({
                            success: false,
                            message:
                                "AI verification response format चुकीचा आहे."
                        });
                    }

                    return res.json({

                        success: true,

                        status:
                            result.status ||
                            "माहिती अपुरी",

                        riskLevel:
                            result.riskLevel ||
                            "माहिती उपलब्ध नाही",

                        schemeName:
                            result.schemeName ||
                            "",

                        claim:
                            result.claim ||
                            "",

                        analysis:
                            result.analysis ||
                            "",

                        warningSigns:
                            Array.isArray(
                                result.warningSigns
                            )
                                ? result.warningSigns
                                : [],

                        databaseMatch:
                            result.databaseMatch === true,

                        officialSource:
                            result.officialSource ||
                            "",

                        recommendation:
                            result.recommendation ||
                            "",

                        importantNote:
                            result.importantNote ||
                            "OTP, PIN, password किंवा bank details share करू नका."

                    });

                } catch (aiError) {

                    console.error(
                        "FAKE DETECTOR AI ERROR:",
                        aiError
                    );

                    return res.status(500).json({
                        success: false,
                        message:
                            aiError.message ||
                            "Fake Scheme Detector error."
                    });
                }

            }
        );

    } catch (error) {

        console.error(
            "FAKE DETECTOR API ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Fake Scheme Detector server error."
        });
    }

});


// ==========================================================
// 📄 JANSAARTHI DOCUMENT CHECKER
// ==========================================================

app.post(
    "/api/ai/document-checker",
    upload.single("document"),
    async (req, res) => {

        try {

            const file = req.file;

            if (!file) {

                return res.status(400).json({
                    success: false,
                    message:
                        "कृपया document upload करा."
                });
            }

            const {
                scheme,
                user
            } = req.body;

            const apiKey =
                process.env.GEMINI_API_KEY;

            if (!apiKey) {

                return res.status(500).json({
                    success: false,
                    message:
                        "Gemini API key सापडली नाही."
                });
            }

            const schemeData =
                typeof scheme === "string"
                    ? scheme
                    : JSON.stringify(
                        scheme || {},
                        null,
                        2
                    );

            const userData =
                typeof user === "string"
                    ? user
                    : JSON.stringify(
                        user || {},
                        null,
                        2
                    );

            const base64 =
                file.buffer.toString(
                    "base64"
                );

            const prompt = `
तुम्ही JanSaarthi चे
AI Document Checker आहात.

USER PROFILE:

${userData}

SELECTED SCHEME:

${schemeData}

UPLOAD केलेल्या document/image चे विश्लेषण करा.

तपासा:

1. Document readable आहे का?
2. Document चा प्रकार काय आहे?
3. Scheme साठी हा document संबंधित आहे का?
4. Document मध्ये आवश्यक माहिती दिसते का?
5. Document अस्पष्ट / incomplete आहे का?
6. उपलब्ध scheme information नुसार document उपयोगी आहे का?

महत्त्वाचे:

- Document genuine आहे असे निश्चित सांगू नका.
- फक्त image/document मधून दिसणारी माहिती सांगा.
- खोटी माहिती बनवू नका.
- अंतिम document verification संबंधित विभाग करेल.
- सोप्या मराठीत उत्तर द्या.
- फक्त valid JSON द्या.

JSON FORMAT:

{
    "status": "योग्य / अपूर्ण / अस्पष्ट / संबंधित नाही / माहिती अपुरी",
    "documentType": "Document प्रकार",
    "analysis": "Document analysis",
    "issues": [
        "आढळलेली समस्या"
    ],
    "suggestions": [
        "काय सुधारावे"
    ],
    "importantNote": "अंतिम verification संबंधित विभाग करेल."
}

फक्त JSON द्या.
`;

            const response =
                await fetch(
                    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
                    apiKey,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            contents: [
                                {
                                    parts: [

                                        {
                                            text:
                                                prompt
                                        },

                                        {
                                            inline_data: {
                                                mime_type:
                                                    file.mimetype,
                                                data:
                                                    base64
                                            }
                                        }

                                    ]
                                }
                            ],

                            generationConfig: {
                                temperature: 0.1,
                                responseMimeType:
                                    "application/json"
                            }
                        })
                    }
                );

            const rawResponse =
                await response.text();

            let data = {};

            try {

                data =
                    rawResponse
                        ? JSON.parse(
                            rawResponse
                        )
                        : {};

            } catch (error) {

                console.error(
                    "DOCUMENT CHECKER NON JSON:",
                    rawResponse
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "Gemini कडून valid response मिळाला नाही."
                });
            }

            if (!response.ok) {

                console.error(
                    "DOCUMENT CHECKER GEMINI ERROR:",
                    data
                );

                return res.status(500).json({
                    success: false,
                    message:
                        data?.error?.message ||
                        "Document AI error आला."
                });
            }

            const aiText =
                data?.candidates?.[0]
                    ?.content?.parts?.[0]?.text;

            if (!aiText) {

                return res.status(502).json({
                    success: false,
                    message:
                        "AI कडून document analysis मिळाला नाही."
                });
            }

            let result;

            try {

                let cleanText =
                    aiText
                        .replace(
                            /```json/gi,
                            ""
                        )
                        .replace(
                            /```/g,
                            ""
                        )
                        .trim();

                const start =
                    cleanText.indexOf("{");

                const end =
                    cleanText.lastIndexOf("}");

                if (
                    start === -1 ||
                    end === -1
                ) {
                    throw new Error(
                        "Invalid JSON"
                    );
                }

                cleanText =
                    cleanText.substring(
                        start,
                        end + 1
                    );

                result =
                    JSON.parse(
                        cleanText
                    );

            } catch (error) {

                console.error(
                    "DOCUMENT CHECKER JSON ERROR:",
                    aiText
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "AI document response format चुकीचा आहे."
                });
            }

            return res.json({

                success: true,

                data: {

                    status:
                        result.status ||
                        "माहिती अपुरी",

                    documentType:
                        result.documentType ||
                        "",

                    analysis:
                        result.analysis ||
                        "",

                    issues:
                        Array.isArray(
                            result.issues
                        )
                            ? result.issues
                            : [],

                    suggestions:
                        Array.isArray(
                            result.suggestions
                        )
                            ? result.suggestions
                            : [],

                    importantNote:
                        result.importantNote ||
                        "अंतिम verification संबंधित विभाग करेल."

                }

            });

        } catch (error) {

            console.error(
                "DOCUMENT CHECKER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Document Checker error."
            });
        }

    }
);
server.listen(PORT, () => {

    console.log("");

    console.log("======================================");
    console.log("🚀 JanSaarthi Backend Started");
    console.log("======================================");

    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`📋 Schemes: http://localhost:${PORT}/api/schemes`);
    console.log(`📰 Updates: http://localhost:${PORT}/api/updates`);
    console.log(`🔐 Admin Login: http://localhost:${PORT}/api/admin/login`);
    console.log(`👤 User Register: http://localhost:${PORT}/api/auth/register`);
    console.log(`🔑 User Login: http://localhost:${PORT}/api/auth/login`);
    console.log(`👥 Admin Users: http://localhost:${PORT}/api/admin/users`);

    console.log("======================================");
    console.log("");

});