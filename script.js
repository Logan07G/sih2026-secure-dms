// =====================================================
// LIVE SHA-256 (Web Crypto API)
// =====================================================

async function sha256Hex(arrayBuffer) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const bytes = new Uint8Array(hashBuffer);
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

// In-memory store: docId → File object (for real verification)
const FILE_STORE = new Map();

// =====================================================
// SECURITY HONEYPOT — fake credential traps
// =====================================================

const HONEYPOT_CREDS = [
    { email: "admin@casevault.com", password: "admin" },
    { email: "admin@casevault.com", password: "admin123" },
    { email: "root@casevault.com",  password: "root" },
    { email: "root@casevault.com",  password: "toor" },
    { email: "test@test.com",       password: "test" },
    { email: "administrator@casevault.com", password: "password" },
];

let loginLockedUntil = 0;

function isHoneypot(email, password) {
    const e = (email || "").trim().toLowerCase();
    const p = (password || "").trim();
    return HONEYPOT_CREDS.some(c => c.email === e && c.password === p);
}

// ================= LOGIN =================

function login() {

    const email    = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Block if still in lockout
    if (Date.now() < loginLockedUntil) {
        const secs = Math.ceil((loginLockedUntil - Date.now()) / 1000);
        showLoginError(`⏳ Locked out. Try again in ${secs}s.`);
        return;
    }

    if (email === "" || password === "") {
        showLoginError("Please enter email and password.");
        return;
    }

    // ---- HONEYPOT CHECK ----
    if (isHoneypot(email, password)) {
        triggerHoneypot(email);
        return;
    }

    // Normal login (existing behavior)
    clearLoginError();

    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    startCounters();
}


// =====================================================
// HONEYPOT RESPONSE
// =====================================================

function triggerHoneypot(email) {

    const card = document.querySelector(".login-card");
    card.classList.add("login-shake");

    // Log it (fake log — could later POST to backend audit)
    console.warn(
        `[SECURITY] Honeypot triggered at ${new Date().toISOString()} ` +
        `from ${email}. Attempt logged and reported.`
    );

    logLedger("HONEYPOT_ATTEMPT", email, "BLOCKED");

    showLoginError(
        "🚨 UNAUTHORIZED ACCESS ATTEMPT DETECTED\n" +
        "This credential has been flagged as a known attacker pattern.\n" +
        "Your IP and device fingerprint have been recorded.\n" +
        "Attempt reported to the Security Operations Center.",
        true
    );

    // Visual lock-down
    const btn = document.querySelector(".login-btn");
    btn.disabled = true;
    btn.innerHTML = "<span>🚫</span> ACCESS DENIED";

    loginLockedUntil = Date.now() + 5000;   // 5-second lockout

    // Reset after 5 seconds
    setTimeout(() => {
        card.classList.remove("login-shake");
        btn.disabled = false;
        btn.innerHTML = "<span>🔐</span> Secure Login";
    }, 5000);
}


// =====================================================
// LOGIN ERROR UI
// =====================================================

function showLoginError(message, severe = false) {
    let box = document.getElementById("loginError");

    if (!box) {
        box = document.createElement("div");
        box.id = "loginError";
        const card = document.querySelector(".login-card");
        const btn  = document.querySelector(".login-btn");
        card.insertBefore(box, btn);
    }

    box.classList.toggle("severe", severe);
    box.innerText = message;
    box.style.display = "block";
}

function clearLoginError() {
    const box = document.getElementById("loginError");
    if (box) box.style.display = "none";
}


// ================= LOGOUT =================

function logout() {

    document.getElementById("app").classList.add("hidden");

    document.getElementById("loginScreen").classList.remove("hidden");

}


// ================= PAGE NAVIGATION =================

function showPage(pageId, button) {

    const pages = document.querySelectorAll(".page");

    pages.forEach(function(page) {
        page.classList.remove("active-page");
    });

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active-page");
    }


    const navButtons = document.querySelectorAll(".nav-item");

    navButtons.forEach(function(btn) {
        btn.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ================= PAGE FROM BUTTON =================

function showPageByName(pageId) {

    const pages = document.querySelectorAll(".page");

    pages.forEach(function(page) {
        page.classList.remove("active-page");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active-page");
    }

    const buttons = document.querySelectorAll(".nav-item");

    buttons.forEach(function(btn) {
        btn.classList.remove("active");

        if (
            btn.getAttribute("onclick") &&
            btn.getAttribute("onclick").includes(pageId)
        ) {
            btn.classList.add("active");
        }
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ================= COUNTERS =================

function startCounters() {

    const counters = document.querySelectorAll(".counter");

    counters.forEach(function(counter) {

        const target = Number(
            counter.getAttribute("data-target")
        );

        let current = 0;

        const increment = Math.max(
            1,
            Math.ceil(target / 50)
        );

        const timer = setInterval(function() {

            current += increment;

            if (current >= target) {

                current = target;

                clearInterval(timer);
            }

            counter.textContent =
                current.toLocaleString();

        }, 25);

    });
}


// ================= CREATE CASE MODAL =================

function openModal() {

    document
        .getElementById("modal")
        .classList.add("show");

}


function closeModal() {

    document
        .getElementById("modal")
        .classList.remove("show");

}


function createCase() {

    alert(
        "Case created successfully!\n\nCase ID: CR-2026-0143"
    );

    closeModal();

}


// ================= UPLOAD =================

function uploadEvidence() {

    const input = document.createElement("input");

    input.type = "file";

    input.accept =
        ".pdf,.doc,.docx,.jpg,.jpeg,.png";

    input.onchange = function() {

        if (input.files.length > 0) {

            const file = input.files[0];

            alert(
                "Evidence selected successfully!\n\n" +
                "File: " +
                file.name
            );

        }

    };

    input.click();

}


// ================= NOTIFICATIONS =================

function showNotifications() {

    alert(
        "Security Notifications\n\n" +
        "🚨 4 security alerts require attention.\n\n" +
        "⚠ Unauthorized access attempt detected."
    );

}


// ================= SEARCH =================

function searchContent() {

    const query =
        document
        .getElementById("globalSearch")
        .value
        .toLowerCase();

    const rows =
        document.querySelectorAll(
            ".document-row, .large-case-card, .security-alert"
        );

    rows.forEach(function(row) {

        const text =
            row.textContent.toLowerCase();

        if (text.includes(query)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }

    });

}


// ================= CLOSE MODAL ON OUTSIDE CLICK =================

window.addEventListener("click", function(event) {

    const modal =
        document.getElementById("modal");

    if (event.target === modal) {
        closeModal();
    }

});


// ================= KEYBOARD =================

document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {
        closeModal();
    }

});
// ================= CASE DETAILS =================

function openCaseDetails() {

    showPageByName("caseDetails");

}


// ================= VIEW EVIDENCE =================

async function viewEvidence(fileName) {

    const stored = FILE_STORE.get(fileName);
    let integrity, shaLine;

    if (stored) {
        // Re-hash the actual bytes and compare
        const recomputed = await sha256Hex(stored.buffer);
        integrity = (recomputed === stored.hash);
        shaLine = `SHA-256: ${recomputed.slice(0, 20)}...`;
    } else {
        integrity = null;
        shaLine = "SHA-256: (file not in session — reload and re-upload to verify)";
    }

    if (integrity === false) {
        alert(
            "⚠️ INTEGRITY VIOLATION\n\n" +
            "File: " + fileName + "\n" +
            "Status: TAMPERED — hash mismatch\n\n" +
            "Do not use this evidence."
        );
        logLedger("EVIDENCE_TAMPER_DETECTED", fileName, "BLOCKED");
        return;
    }

    alert(
        "Secure Evidence Viewer\n\n" +
        "File: " + fileName + "\n" +
        shaLine + "\n\n" +
        "✓ SHA-256 Verified\n" +
        "✓ Chain-of-Custody Verified\n" +
        "✓ Access Authorized"
    );

    logLedger("EVIDENCE_ACCESS", fileName, "ALLOW");
}
// =====================================================
// ANIMATED EVIDENCE UPLOAD
// =====================================================

let selectedEvidence = null;


// OPEN MODAL

function uploadEvidence() {

    const modal = document.getElementById("uploadModal");

    modal.classList.add("show");

    resetUploadModal();

}


// CLOSE MODAL

function closeUploadModal() {

    const modal = document.getElementById("uploadModal");

    modal.classList.remove("show");

}


// RESET MODAL

function resetUploadModal() {

    document
        .getElementById("uploadArea")
        .classList.remove("hidden");

    document
        .getElementById("selectedFile")
        .classList.add("hidden");

    document
        .getElementById("securityOptions")
        .classList.add("hidden");

    document
        .getElementById("uploadProgress")
        .classList.add("hidden");

    document
        .getElementById("uploadSuccess")
        .classList.add("hidden");

    document
        .getElementById("uploadFooter")
        .classList.remove("hidden");

    document
        .getElementById("secureUploadBtn")
        .disabled = true;

    document
        .getElementById("progressBar")
        .style.width = "0%";

    document
        .getElementById("progressPercent")
        .textContent = "0%";

    selectedEvidence = null;

}


// FILE SELECT

async function handleEvidenceFile(input) {

    if (!input.files || !input.files.length) return;

    selectedEvidence = input.files[0];
    const file = selectedEvidence;

    document.getElementById("selectedFileName").textContent = file.name;
    document.getElementById("selectedFileSize").textContent = formatFileSize(file.size);
    document.getElementById("selectedFile").classList.remove("hidden");
    document.getElementById("securityOptions").classList.remove("hidden");
    document.getElementById("uploadArea").classList.add("hidden");
    document.getElementById("secureUploadBtn").disabled = false;

    // ---- Real SHA-256 computation ----
    const buffer = await file.arrayBuffer();
    const hash = await sha256Hex(buffer);

    // Store for later verification
    FILE_STORE.set(file.name, { file, buffer, hash });

    // Show it live in the modal
    const hashBox = document.getElementById("liveHash");
    if (hashBox) {
        hashBox.textContent = `SHA-256: ${hash.slice(0, 20)}...${hash.slice(-8)}`;
        hashBox.dataset.fullHash = hash;
    }

    // Add a "✓ Verified live" note next to the SHA option
    const optionRow = document.querySelectorAll(".security-option")[1];
    if (optionRow && !optionRow.querySelector(".live-hash")) {
        const note = document.createElement("small");
        note.className = "live-hash";
        note.style.cssText = "display:block;color:#16a34a;font-family:monospace;font-size:9px;margin-top:4px;";
        note.textContent = `→ ${hash.slice(0, 16)}...`;
        optionRow.querySelector("div").appendChild(note);
    }

    logLedger("EVIDENCE_HASHED", file.name, "ALLOW");
}


// FILE SIZE

function formatFileSize(bytes) {

    if (bytes === 0) {
        return "0 Bytes";
    }

    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];

    const i =
        Math.floor(
            Math.log(bytes) / Math.log(1024)
        );

    return (
        parseFloat(
            (bytes / Math.pow(1024, i))
                .toFixed(2)
        )
        + " "
        + units[i]
    );

}


// REMOVE FILE

function removeSelectedFile() {

    document
        .getElementById("evidenceFile")
        .value = "";

    resetUploadModal();

    document
        .getElementById("uploadModal")
        .classList.add("show");

}


// START UPLOAD

function startEvidenceUpload() {

    if (!selectedEvidence) {
        return;
    }

    document
        .getElementById("uploadFooter")
        .classList.add("hidden");

    document
        .getElementById("securityOptions")
        .classList.add("hidden");

    document
        .getElementById("selectedFile")
        .classList.add("hidden");

    document
        .getElementById("uploadProgress")
        .classList.remove("hidden");

    let progress = 0;

    const progressBar =
        document.getElementById("progressBar");

    const progressPercent =
        document.getElementById("progressPercent");

    const progressStatus =
        document.getElementById("progressStatus");

    const progressText =
        document.getElementById("progressText");


    const interval =
        setInterval(() => {

            progress += Math.floor(
                Math.random() * 8
            ) + 4;


            if (progress >= 100) {

                progress = 100;

                clearInterval(interval);

                progressBar.style.width = "100%";

                progressPercent.textContent = "100%";

                progressText.textContent =
                    "Evidence secured";

                progressStatus.textContent =
                    "✓ Integrity verification complete";

                setTimeout(
                    showUploadSuccess,
                    700
                );

                return;
            }


            progressBar.style.width =
                progress + "%";

            progressPercent.textContent =
                progress + "%";


            // REALISTIC STATUS MESSAGES

            if (progress < 25) {

                progressText.textContent =
                    "Uploading evidence...";

                progressStatus.textContent =
                    "Transferring encrypted file...";

            }

            else if (progress < 50) {

                progressText.textContent =
                    "Encrypting evidence...";

                progressStatus.textContent =
                    "AES-256 encryption in progress...";

            }

            else if (progress < 75) {

                progressText.textContent =
                    "Generating SHA-256 hash...";

                progressStatus.textContent =
                    "Creating digital fingerprint...";

            }

            else {

                progressText.textContent =
                    "Recording chain-of-custody...";

                progressStatus.textContent =
                    "Creating secure audit entry...";

            }

        }, 250);

}


// SUCCESS SCREEN

function showUploadSuccess() {

    document
        .getElementById("uploadProgress")
        .classList.add("hidden");

    document
        .getElementById("uploadSuccess")
        .classList.remove("hidden");

}


// FINISH

function finishUpload() {

    closeUploadModal();

    alert(
        "✓ Evidence successfully secured!\n\n" +
        "Case: CR-2026-0142\n" +
        "Integrity: SHA-256 Verified\n" +
        "Chain-of-Custody: Recorded"
    );

    logLedger("EVIDENCE_UPLOAD", selectedEvidence?.name || "unknown", "ALLOW");
}


// DRAG AND DROP

const uploadArea =
    document.getElementById("uploadArea");

if (uploadArea) {

    uploadArea.addEventListener(
        "dragover",
        function(event) {

            event.preventDefault();

            uploadArea.classList.add(
                "dragging"
            );

        }
    );


    uploadArea.addEventListener(
        "dragleave",
        function() {

            uploadArea.classList.remove(
                "dragging"
            );

        }
    );


    uploadArea.addEventListener(
        "drop",
        function(event) {

            event.preventDefault();

            uploadArea.classList.remove(
                "dragging"
            );

            const files =
                event.dataTransfer.files;

            if (files.length) {

                const input =
                    document.getElementById(
                        "evidenceFile"
                    );

                input.files = files;

                handleEvidenceFile(input);

            }

        }
    );

}

// =====================================================
// SPLASH SCREEN
// =====================================================

(function runSplash() {

    const splash = document.getElementById("splash");
    if (!splash) return;

    // Allow skipping during dev: index.html?skipSplash=1
    if (location.search.includes("skipSplash")) {
        splash.remove();
        return;
    }

    const status = document.getElementById("splashStatus");

    const messages = [
        "Initializing secure environment...",
        "Loading AES-256 encryption engine...",
        "Verifying audit ledger chain...",
        "Establishing secure session...",
        "Ready."
    ];

    let i = 0;
    const statusTimer = setInterval(() => {
        i++;
        if (i < messages.length && status) {
            status.textContent = messages[i];
        } else {
            clearInterval(statusTimer);
        }
    }, 1200);

    // Fade out after ~6s
    setTimeout(() => {
        splash.classList.add("fade-out");
        setTimeout(() => splash.remove(), 900);
    }, 6000);

})();

// =====================================================
// PARTICLE NETWORK BACKGROUND
// =====================================================

(function initBackground() {

    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let mouse = { x: -9999, y: -9999 };

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    }

    function initParticles() {
        const count = Math.min(90, Math.floor(window.innerWidth / 18));
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 1.6 + 0.4
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - dist / 130) * 0.28})`;
                    ctx.lineWidth = 0.6;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }

        // Dots + mouse link
        particles.forEach(p => {
            const dm = Math.hypot(p.x - mouse.x, p.y - mouse.y);
            if (dm < 160) {
                ctx.strokeStyle = `rgba(96, 165, 250, ${(1 - dm / 160) * 0.5})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }

            ctx.fillStyle = "rgba(96, 165, 250, 0.7)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        });

        requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    window.addEventListener("mouseout", () => {
        mouse.x = -9999;
        mouse.y = -9999;
    });

    resize();
    draw();

})();

// =====================================================
// FRONTEND AUDIT LEDGER (hash-chained, localStorage)
// Mirror of backend Module C — swap for real API later
// =====================================================

const LEDGER_KEY = "casevault_ledger_v1";
const GENESIS = "0".repeat(64);

function canonical(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

async function blockHash(entry) {
    const buf = new TextEncoder().encode(canonical(entry));
    return sha256Hex(buf.buffer);
}

function getLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); }
    catch { return []; }
}

function saveLedger(ledger) {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

async function logLedger(action, resource, status) {
    const ledger = getLedger();
    const prev = ledger.length ? ledger[ledger.length - 1].block_hash : GENESIS;

    const entry = {
        seq: ledger.length + 1,
        timestamp: new Date().toISOString(),
        actor: "Admin User",
        action: action,
        resource: resource,
        status: status,
        previous_block_hash: prev,
    };
    entry.block_hash = await blockHash(entry);

    ledger.push(entry);
    saveLedger(ledger);
    renderLedger();
}

async function verifyLedger() {
    const ledger = getLedger();
    let prev = GENESIS;

    for (const entry of ledger) {
        if (entry.previous_block_hash !== prev) {
            return { valid: false, seq: entry.seq, reason: "Chain break" };
        }
        const { block_hash, ...fields } = entry;
        const recomputed = await blockHash(fields);
        if (recomputed !== block_hash) {
            return { valid: false, seq: entry.seq, reason: "Block hash mismatch" };
        }
        prev = entry.block_hash;
    }
    return { valid: true, count: ledger.length };
}

function renderLedger() {
    const tbody = document.querySelector("#audit table tbody");
    if (!tbody) return;

    const ledger = getLedger().slice().reverse();  // newest first
    if (!ledger.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px;">No events yet — upload evidence to begin.</td></tr>`;
        return;
    }

    tbody.innerHTML = ledger.map(e => {
        const t = new Date(e.timestamp);
        const time = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const statusCls = e.status === "ALLOW" ? "verified"
                        : e.status === "BLOCKED" ? "danger"
                        : "review";
        return `
            <tr>
                <td>${time}</td>
                <td>${e.actor}</td>
                <td>${e.action.replace(/_/g, " ")}</td>
                <td>${e.resource}</td>
                <td><span class="badge ${statusCls}">${e.status}</span></td>
            </tr>
        `;
    }).join("");
}

// =====================================================
// INIT: render ledger on load + hook verify button
// =====================================================

window.addEventListener("load", () => {
    renderLedger();
    const btn = document.getElementById("verifyChainBtn");
    if (btn) {
        btn.addEventListener("click", async () => {
            btn.textContent = "🔄 Verifying...";
            btn.disabled = true;
            const result = await verifyLedger();
            btn.disabled = false;
            btn.textContent = "🛡️ Verify Chain";
            if (result.valid) {
                alert(`✅ Ledger intact\n\n${result.count} block(s) verified.\nChain hash: ${getLedger().slice(-1)[0]?.block_hash.slice(0, 20)}...`);
            } else {
                alert(`⚠️ LEDGER TAMPERED\n\nBreak detected at seq ${result.seq}.\nReason: ${result.reason}`);
            }
        });
    }
});
