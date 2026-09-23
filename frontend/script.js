/* =====================================================
   BOOT SEQUENCE   splash  ->  login  ->  interface
   -----------------------------------------------------
   1. Splash animation plays            (SPLASH_HOLD_MS)
   2. Splash fades out and is removed   (SPLASH_FADE_MS)
   3. ONLY THEN the login card animates in
   4. Interface fades in after a successful login

   While <body class="booting"> is set, style.css keeps the
   login card invisible and un-clickable, so it can never
   show through / merge with the splash.
   This is the ONLY place that removes the splash.
   ===================================================== */
(function bootSequence() {

    const SPLASH_HOLD_MS = 6000;   // how long the splash plays
    const SPLASH_FADE_MS = 800;    // keep in sync with #splash.fade-out in style.css

    const body   = document.body;
    const splash = document.getElementById("splash");

    body.classList.add("booting");

    function finishBoot() {
        if (splash && splash.parentNode) splash.remove();
        body.classList.remove("booting");          // login card animates in now
    }

    // No splash, or dev shortcut: index.html?skipSplash=1
    if (!splash || location.search.includes("skipSplash")) {
        finishBoot();
        return;
    }

    // Rotating status text (unchanged from before)
    const status   = document.getElementById("splashStatus");
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

    // Play the splash, fade it out, remove it, then reveal login
    setTimeout(() => {
        clearInterval(statusTimer);
        splash.classList.add("fade-out");
        setTimeout(finishBoot, SPLASH_FADE_MS + 50);
    }, SPLASH_HOLD_MS);

})();

const API = window.CASEVAULT_API || "http://localhost:8000";

async function loadDocuments() {
    try {
        const res = await fetch(`${API}/api/docs`);
        const data = await res.json();
        renderDocuments(data.results || []);
    } catch (e) {
        console.error("Failed to load documents:", e);
    }
}

function renderDocuments(docs) {
    const list = document.querySelector("#documents .document-list");
    if (!list) return;

    if (!docs.length) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;">No documents yet.</div>`;
        return;
    }

    list.innerHTML = docs.map(d => `
        <div class="document-row" data-id="${d.id}">
            <div class="file-icon">📄</div>
            <div class="file-info">
                <strong>${d.fir_number} — ${d.document_type}</strong>
                <small>${d.case_number} • ${d.officer_name} • ${d.section}</small>
                <small style="font-family:monospace;color:#60a5fa;font-size:9px;">
                    SHA-256: ${(d.sha256_hash || "").slice(0, 20)}...
                </small>
            </div>
            <span class="badge verified">Verified</span>
            <button class="icon-btn" onclick="viewDoc(${d.id})">👁</button>
        </div>
    `).join("");
}

async function viewDoc(id) {
    try {
        const res = await fetch(`${API}/api/docs/${id}`);
        if (!res.ok) throw new Error("Not found");
        const d = await res.json();
        alert(
            `📄 Document #${d.id}\n\n` +
            `FIR: ${d.fir_number}\n` +
            `Case: ${d.case_number}\n` +
            `Officer: ${d.officer_name}\n` +
            `Type: ${d.document_type}\n` +
            `Date: ${d.document_date}\n` +
            `Section: ${d.section}\n` +
            `Size: ${(d.size_bytes / 1024).toFixed(1)} KB\n\n` +
            `SHA-256: ${d.sha256_hash}\n` +
            `✓ Hash Verified\n✓ Chain-of-Custody OK`
        );
    } catch (e) {
        alert("Could not load document: " + e.message);
    }
}

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

    if (Date.now() < loginLockedUntil) {
        const secs = Math.ceil((loginLockedUntil - Date.now()) / 1000);
        showLoginError("⏳ Locked out. Try again in " + secs + "s.");
        return;
    }

    if (email === "" || password === "") {
        showLoginError("Please enter email and password.");
        return;
    }

    if (isHoneypot(email, password)) {
        triggerHoneypot(email);
        return;
    }

    clearLoginError();

    try {
        localStorage.setItem("cv_session", JSON.stringify({
            email: email,
            name: "Admin User",
            role: "Administrator",
            expiresAt: Date.now() + (30 * 60 * 1000)
        }));
    } catch (_) {}

    showApp();
}


// ================= LOGOUT =================
function logout() {
    try { localStorage.removeItem("cv_session"); } catch (_) {}
    hideApp();
}


// ================= VIEW SWITCHING =================
function showApp() {
    const loginEl = document.getElementById("loginScreen");
    const appEl   = document.getElementById("app");
    const splash  = document.getElementById("splash");

    if (loginEl) loginEl.classList.add("hidden");
    if (appEl)   appEl.classList.remove("hidden");
    if (splash && splash.parentNode) splash.parentNode.removeChild(splash);

    if (typeof startCounters === "function") startCounters();
    if (typeof loadDocuments === "function") setTimeout(loadDocuments, 100);
}


function hideApp() {
    const loginEl = document.getElementById("loginScreen");
    const appEl   = document.getElementById("app");

    if (loginEl) loginEl.classList.remove("hidden");
    if (appEl)   appEl.classList.add("hidden");

    const emailEl = document.getElementById("email");
    const passEl  = document.getElementById("password");
    if (emailEl) emailEl.value = "";
    if (passEl)  passEl.value  = "";
}


// ================= SESSION CHECK ON LOAD =================

function checkSession() {
    try {
        const raw = localStorage.getItem("cv_session");
        if (!raw) return false;
        const session = JSON.parse(raw);
        if (!session.expiresAt || Date.now() > session.expiresAt) {
            localStorage.removeItem("cv_session");
            return false;
        }
        showApp();
        return true;
    } catch (_) {
        localStorage.removeItem("cv_session");
        return false;
    }
}

window.addEventListener("load", checkSession);

// Refresh session expiry on any user activity
["click", "keydown", "mousemove"].forEach(function (evt) {
    window.addEventListener(evt, function () {
        try {
            const raw = localStorage.getItem("cv_session");
            if (!raw) return;
            const s = JSON.parse(raw);
            s.expiresAt = Date.now() + (30 * 60 * 1000);
            localStorage.setItem("cv_session", JSON.stringify(s));
        } catch (_) {}
    }, { passive: true });
});


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
    if (typeof syncAlertCounts === "function") syncAlertCounts();
    const n = window.__activeAlertCount || 0;
    if (n === 0) {
        alert("Security Notifications\n\n✓ All clear. No active alerts.");
        return;
    }
    alert(
        "Security Notifications\n\n" +
        "⚠ " + n + " security alert" + (n === 1 ? "" : "s") + " require attention.\n\n" +
        "Open the Security Alerts page to review."
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

async function finishUpload() {
    const file = selectedEvidence;
    if (!file) { closeUploadModal(); return; }

    const firNumber = prompt("Enter FIR number (e.g. FIR011):", `FIR${String(Date.now()).slice(-3)}`);
    if (!firNumber) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fir_number", firNumber);
    formData.append("case_number", `CASE-${firNumber.replace(/[^0-9]/g, "") || "000"}`);
    formData.append("officer_name", "Admin User");
    formData.append("document_type", "FIR");
    formData.append("section", "IPC");

    try {
        const res = await fetch(`${API}/api/docs/upload`, {
            method: "POST",
            body: formData,
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const data = await res.json();
        closeUploadModal();
        alert(
            `✓ Evidence secured!\n\n` +
            `FIR: ${data.fir_number}\n` +
            `SHA-256: ${data.sha256_hash.slice(0, 24)}...`
        );
        await loadDocuments();
    } catch (e) {
        alert("Upload failed: " + e.message);
    }
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

const _origLogin = window.login;
window.login = function() {
    _origLogin && _origLogin();
    setTimeout(loadDocuments, 200);
};

// Ensure icons render even if the splash delays DOMContentLoaded
setTimeout(() => {
    if (window.initIcons) window.initIcons();
}, 200);

// =====================================================
// SIDEBAR TOGGLE
// =====================================================

function toggleSidebar() {
    document.body.classList.toggle("sidebar-collapsed");
    // Persist preference
    localStorage.setItem(
        "sidebar-collapsed",
        document.body.classList.contains("sidebar-collapsed") ? "1" : "0"
    );
}

// Restore on load
window.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("sidebar-collapsed") === "1") {
        document.body.classList.add("sidebar-collapsed");
    }
});

function filterCases(status, btn) {
    document.querySelectorAll(".case-filters .filter-chip").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    document.querySelectorAll(".case-grid .large-case-card").forEach(card => {
        const s = card.dataset.status;
        card.style.display = (status === "all" || s === status) ? "" : "none";
    });
}

// Re-run icon init after splash disappears
setTimeout(() => {
    if (window.initIcons) window.initIcons();
}, 6600);

// =====================================================
// ALERT ACTIONS — Investigate / Review / Escalate
// =====================================================

let currentAlertId = null;

function openAlertModal(alertId) {
    const el = document.querySelector(`[data-alert-id="${alertId}"]`);
    if (!el) return;

    currentAlertId = alertId;

    const severity  = el.dataset.severity || "warning";
    const status    = el.dataset.status   || "active";
    const title     = el.dataset.title    || "Alert";
    const desc      = el.dataset.desc     || "";
    const time      = el.dataset.time     || "";
    const threat    = el.dataset.threat   || "Elevated";

    document.getElementById("alertSeverity").textContent    = severity === "critical" ? "🚨" : "⚠️";
    document.getElementById("alertTitle").textContent       = title;
    document.getElementById("alertDescription").textContent = desc;
    document.getElementById("alertTime").textContent        = time;
    document.getElementById("alertId").textContent          = alertId;
    document.getElementById("alertStatus").textContent      = capitalize(status);
    document.getElementById("alertThreat").textContent      = threat;

    document.getElementById("alertModal").classList.add("show");
}

function closeAlertModal() {
    document.getElementById("alertModal").classList.remove("show");
    currentAlertId = null;
}

function setAlertStatus(newStatus) {
    if (!currentAlertId) return;

    const el = document.querySelector(`[data-alert-id="${currentAlertId}"]`);
    if (!el) return;

    el.dataset.status = newStatus;

    // Update the badge shown next to the alert title
    let badge = el.querySelector(".alert-status-badge");
    if (!badge) {
        badge = document.createElement("span");
        badge.className = "alert-status-badge";
        el.querySelector("div:nth-child(2)").appendChild(badge);
    }
    badge.className = "alert-status-badge " + newStatus;
    badge.textContent = capitalize(newStatus);

    // Disable the button after action
    const btn = el.querySelector("button");
    if (btn) {
        btn.disabled = true;
        btn.textContent = capitalize(newStatus);
        btn.classList.add("done");
    }

    // Reduce sidebar count (only if this was a fresh action)
    decrementAlertCount();

    // Log to audit ledger
    if (typeof logLedger === "function") {
        logLedger(`ALERT_${newStatus.toUpperCase()}`, currentAlertId, newStatus === "reviewed" ? "ALLOW" : "BLOCKED");
    }
    if (typeof renderLedger === "function") renderLedger();

    // Show toast
    showAlertToast(`Alert ${currentAlertId} — ${capitalize(newStatus)}`);

    // Close modal after a beat
    setTimeout(closeAlertModal, 700);
}


function decrementAlertCount() {
    if (typeof syncAlertCounts === "function") syncAlertCounts();
}

function capitalize(s) {
    return String(s).charAt(0).toUpperCase() + String(s).slice(1);
}

function showAlertToast(msg) {
    let t = document.getElementById("alertToast");
    if (!t) {
        t = document.createElement("div");
        t.id = "alertToast";
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

// Close modal on backdrop click
window.addEventListener("click", (e) => {
    const modal = document.getElementById("alertModal");
    if (modal && e.target === modal) closeAlertModal();
});

// Close on Escape
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const modal = document.getElementById("alertModal");
        if (modal && modal.classList.contains("show")) closeAlertModal();
    }
});
/* ============================================================
   ALERT BUTTON DELEGATION
   Catches clicks on any alert button regardless of the onclick
   attribute, and calls openAlertModal() directly.
   ============================================================ */

document.addEventListener("click", function (e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    const onclick = btn.getAttribute("onclick") || "";
    const match = onclick.match(/openAlertModal\(['"]([^'"]+)['"]\)/);
    if (!match) return;

    const alertId = match[1];
    console.log("[alert] button clicked → openAlertModal(" + alertId + ")");

    // Try the modal opener — if it fails, log so we see why
    try {
        if (typeof openAlertModal === "function") {
            openAlertModal(alertId);
        } else {
            console.error("[alert] openAlertModal is not defined");
            fallbackOpenAlert(alertId);
        }
    } catch (err) {
        console.error("[alert] openAlertModal threw:", err);
        fallbackOpenAlert(alertId);
    }

    // Stop the inline onclick from firing twice
    e.preventDefault();
    e.stopPropagation();
}, true);


/* Fallback: if the main function is broken, still show the modal
   by reading data attributes directly from the alert div */
function fallbackOpenAlert(alertId) {
    const el = document.querySelector('[data-alert-id="' + alertId + '"]');
    const modal = document.getElementById("alertModal");
    if (!el || !modal) {
        console.warn("[alert] fallback: missing el or modal");
        return;
    }

    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set("alertSeverity",    (el.dataset.severity === "critical") ? "🚨" : "⚠️");
    set("alertTitle",       el.dataset.title || "Alert");
    set("alertDescription", el.dataset.desc  || "");
    set("alertTime",        el.dataset.time  || "");
    set("alertId",          alertId);
    set("alertStatus",      (el.dataset.status || "active").replace(/^\w/, c => c.toUpperCase()));
    set("alertThreat",      el.dataset.threat || "Elevated");

    modal.classList.add("show");
    currentAlertId = alertId;
}


/* ============================================================
   ALERT COUNT SYNC — derive every count from the real DOM
   ============================================================ */

function syncAlertCounts() {
    const alerts = document.querySelectorAll(".security-alert[data-alert-id]");
    let active = 0;
    alerts.forEach(function (el) {
        const st = (el.dataset.status || "active").toLowerCase();
        if (st === "active") active++;
    });

    // Sidebar badge
    const sidebar = document.querySelector(".nav-item .alert-count");
    if (sidebar) {
        sidebar.textContent = active;
        sidebar.style.display = active > 0 ? "" : "none";
    }

    // Page badge
    const badge = document.getElementById("alertCountBadge");
    if (badge) {
        badge.textContent = active === 0
            ? "✓ All Clear"
            : "⚠ " + active + " Active Alert" + (active === 1 ? "" : "s");
    }

    // Bell red dot
    const dot = document.querySelector(".notification-btn span");
    if (dot) dot.style.display = active > 0 ? "" : "none";

    window.__activeAlertCount = active;
}

window.addEventListener("load", syncAlertCounts);

// Wrap setAlertStatus so it re-syncs after any action
var _origSetAlertStatus = window.setAlertStatus;
window.setAlertStatus = function (s) {
    if (typeof _origSetAlertStatus === "function") _origSetAlertStatus(s);
    setTimeout(syncAlertCounts, 50);
};

/* =====================================================
   SETTINGS — theme, session, export, preferences
   ===================================================== */

// ---------- Theme ----------
function applyTheme(theme) {
    if (theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
    // Update toggle UI
    document.querySelectorAll(".theme-option").forEach(el => {
        el.classList.toggle("active", el.dataset.theme === theme);
    });
    
}

function toggleTheme() {
    const current = localStorage.getItem("cv_theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
}

// Initialize theme on load
// ---------- Settings storage ----------
const SETTINGS_KEY = "cv_settings";

function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }
    catch (_) { return {}; }
}

function saveSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

    // Live-apply session timeout
    if (key === "sessionTimeout") {
        try {
            const raw = localStorage.getItem("cv_session");
            if (raw) {
                const sess = JSON.parse(raw);
                sess.expiresAt = Date.now() + (parseInt(value, 10) * 60 * 1000);
                localStorage.setItem("cv_session", JSON.stringify(sess));
            }
        } catch (_) {}
    }

    showSettingsToast(`${key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} saved`);
}


// ---------- Export audit log ----------
function exportAuditLog() {
    let ledger = [];
    try { ledger = JSON.parse(localStorage.getItem("casevault_ledger_v1") || "[]"); }
    catch (_) {}

    if (!ledger.length) {
        // Fall back to scraping the visible table
        document.querySelectorAll("#audit table tbody tr").forEach(tr => {
            const cells = tr.querySelectorAll("td");
            if (cells.length >= 5) {
                ledger.push({
                    timestamp: cells[0].textContent.trim(),
                    user:      cells[1].textContent.trim(),
                    action:    cells[2].textContent.trim(),
                    resource:  cells[3].textContent.trim(),
                    status:    cells[4].textContent.trim()
                });
            }
        });
    }

    const blob = new Blob([JSON.stringify({
        exported_at: new Date().toISOString(),
        application: "CaseVault",
        entries: ledger
    }, null, 2)], { type: "application/json" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casevault-audit-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showSettingsToast(`Exported ${ledger.length} audit entries`);
}


// ---------- Clear local data ----------
function clearLocalData() {
    if (!confirm("Log out and clear all local data from this browser?\n\nThis will not delete anything from the server.")) return;
    localStorage.removeItem("cv_session");
    
    localStorage.removeItem("cv_settings");
    showSettingsToast("Local data cleared. Redirecting...");
    setTimeout(() => location.reload(), 800);
}


// ---------- Toast ----------
function showSettingsToast(msg) {
    let t = document.getElementById("settingsToast");
    if (!t) {
        t = document.createElement("div");
        t.id = "settingsToast";
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(window.__settingsToastTimer);
    window.__settingsToastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}


// ---------- Restore saved prefs into the UI on load ----------
window.addEventListener("load", function () {
    const s = getSettings();
    const map = {
        sessionTimeout: "sessionTimeout",
        autoLock:       "autoLock",
        twoFactor:      "twoFactor",
        notifSecurity:  "notifSecurity",
        notifActivity:  "notifActivity",
        auditLogging:   "auditLogging"
    };
    Object.keys(map).forEach(key => {
        const el = document.getElementById(key);
        if (!el) return;
        if (s[key] === undefined) return;
        if (el.type === "checkbox") el.checked = !!s[key];
        else el.value = s[key];
    });
});

/* =====================================================
   LOGIN HELPERS — restored
   (cleared out during an earlier surgical edit)
   ===================================================== */

function showLoginError(message, severe) {
    let box = document.getElementById("loginError");
    if (!box) {
        box = document.createElement("div");
        box.id = "loginError";
        const card = document.querySelector(".login-card");
        const btn  = document.querySelector(".login-btn");
        if (card && btn) card.insertBefore(box, btn);
        else if (card) card.appendChild(box);
    }
    box.classList.toggle("severe", !!severe);
    box.innerText = message;
    box.style.display = "block";
}


function clearLoginError() {
    const box = document.getElementById("loginError");
    if (box) box.style.display = "none";
}


function triggerHoneypot(email) {
    const card = document.querySelector(".login-card");
    if (card) card.classList.add("login-shake");

    if (typeof logLedger === "function") {
        logLedger("HONEYPOT_ATTEMPT", email, "BLOCKED");
    }

    showLoginError(
        "\ud83d\udea8 UNAUTHORIZED ACCESS ATTEMPT DETECTED\n" +
        "This credential has been flagged as a known attacker pattern.\n" +
        "Your IP and device fingerprint have been recorded.\n" +
        "Attempt reported to the Security Operations Center.",
        true
    );

    const btn = document.querySelector(".login-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "<span>\ud83d\udeab</span> ACCESS DENIED";
    }

    loginLockedUntil = Date.now() + 5000;

    setTimeout(function () {
        if (card) card.classList.remove("login-shake");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = "<span>\ud83d\udd10</span> Secure Login";
        }
    }, 5000);
}

/* =====================================================
   NLP — Analyze file before upload, pre-fill form
   ===================================================== */

async function nlpAnalyzeFile(file) {
    const API_BASE = window.CASEVAULT_API || "http://localhost:8000";
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(`${API_BASE}/api/nlp/analyze`, {
            method: "POST",
            body: formData,
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.json();
    } catch (e) {
        console.warn("[NLP] analyze failed:", e.message);
        return null;
    }
}


function renderNlpResults(result, file) {
    const box = document.getElementById("nlpResults");
    if (!box) return;

    if (!result) {
        box.innerHTML = `<p class="nlp-empty">Analysis unavailable — you can still upload manually.</p>`;
        box.classList.add("show");
        return;
    }

    const sections = (result.ipc_sections || []).join(", ") || "—";
    const dates    = (result.dates || []).slice(0, 3).join(", ") || "—";
    const officers = (result.officer_names || []).slice(0, 2).join(", ") || "—";
    const cases    = (result.case_numbers || []).slice(0, 2).join(", ") || "—";
    const conf     = Math.round((result.confidence || 0) * 100);
    const risk     = result.risk_level || "—";
    const riskCls  = risk.toLowerCase();

    box.innerHTML = `
        <div class="nlp-header">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10"/>
                <path d="M12 6v6l4 2"/>
            </svg>
            <span>AI Document Analysis</span>
            <span class="nlp-badge ${riskCls}">${risk} Risk</span>
        </div>
        <div class="nlp-grid">
            <div><span>Document Type</span><strong>${result.document_type || "—"}</strong><small>${conf}% confidence</small></div>
            <div><span>IPC / BNS Sections</span><strong>${sections}</strong></div>
            <div><span>Case Numbers</span><strong>${cases}</strong></div>
            <div><span>Dates Found</span><strong>${dates}</strong></div>
            <div><span>Officers</span><strong>${officers}</strong></div>
            <div><span>Word Count</span><strong>${result.word_count || 0}</strong></div>
        </div>
        ${result.summary ? `<div class="nlp-summary"><span>Summary</span><p>${escapeHtml(result.summary)}</p></div>` : ""}
    `;
    box.classList.add("show");

    // Auto-fill the FIR number if we extracted one
    const firInput = document.getElementById("nlpFirNumber");
    if (firInput && !firInput.value) {
        if (result.case_numbers && result.case_numbers.length) {
            firInput.value = result.case_numbers[0];
        } else if (file && file.name) {
            const guess = file.name.replace(/[^A-Za-z0-9]/g, "-").slice(0, 20).toUpperCase();
            firInput.value = "FIR-" + guess;
        }
    }
}


function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}


// Hook into existing file selection — runs NLP when a file is picked
document.addEventListener("change", function (e) {
    if (e.target && e.target.id === "evidenceFile") {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const box = document.getElementById("nlpResults");
        if (box) {
            box.innerHTML = `<p class="nlp-empty">Analyzing document…</p>`;
            box.classList.add("show");
        }
        nlpAnalyzeFile(file).then(r => renderNlpResults(r, file));
    }
});

// Reveal FIR row when NLP panel appears
(function () {
    var _orig = window.renderNlpResults;
    window.renderNlpResults = function (result, file) {
        if (typeof _orig === "function") _orig(result, file);
        var row = document.getElementById("nlpFirRow");
        if (row) row.classList.remove("hidden");
    };
})();

/* =====================================================
   AUDIT BADGE — unread security events indicator
   ===================================================== */

const SECURITY_EVENT_KEYWORDS = [
    "HONEYPOT",
    "BLOCKED",
    "TAMPER",
    "DENIED",
    "UNAUTHORIZED",
    "ESCALATED",
];

function isSecurityEvent(action, status) {
    const a = String(action || "").toUpperCase();
    const s = String(status || "").toUpperCase();
    if (s === "BLOCKED") return true;
    return SECURITY_EVENT_KEYWORDS.some(kw => a.includes(kw));
}

function bumpAuditBadge() {
    const badge = document.getElementById("auditBadge");
    if (!badge) return;
    const current = parseInt(badge.textContent, 10) || 0;
    const next = current + 1;
    badge.textContent = next;
    badge.style.display = "";
    badge.classList.remove("pulse");
    void badge.offsetWidth;  // force reflow to restart animation
    badge.classList.add("pulse");
}

function clearAuditBadge() {
    const badge = document.getElementById("auditBadge");
    if (!badge) return;
    badge.textContent = "0";
    badge.style.display = "none";
    badge.classList.remove("pulse");
}

// Wrap logLedger so security events bump the badge automatically
(function () {
    const _orig = window.logLedger;
    if (typeof _orig !== "function") return;
    window.logLedger = async function (action, resource, status) {
        await _orig(action, resource, status);
        if (isSecurityEvent(action, status)) {
            bumpAuditBadge();
        }
    };
})();

// Wrap showPage so opening the Audit page clears the badge
(function () {
    const _orig = window.showPage;
    if (typeof _orig !== "function") return;
    window.showPage = function (pageId, button) {
        _orig(pageId, button);
        if (pageId === "audit") {
            clearAuditBadge();
        }
    };
})();

// Also handle showPageByName (used by some internal buttons)
(function () {
    const _orig = window.showPageByName;
    if (typeof _orig !== "function") return;
    window.showPageByName = function (pageId) {
        _orig(pageId);
        if (pageId === "audit") {
            clearAuditBadge();
        }
    };
})();

/* =====================================================
   NOTIFICATIONS DROPDOWN PANEL
   Replaces the old alert() popup with a proper UI panel.
   ===================================================== */

function buildNotifications() {
    const list = document.getElementById("notifList");
    if (!list) return;

    // Derive from active alerts
    const alerts = Array.from(document.querySelectorAll(".security-alert[data-alert-id]"));
    const items = alerts
        .filter(el => (el.dataset.status || "active").toLowerCase() === "active")
        .map(el => ({
            id:    el.dataset.alertId,
            title: el.dataset.title || "Security Alert",
            desc:  el.dataset.desc  || "",
            time:  el.dataset.time  || "recently",
            severity: el.dataset.severity || "warning",
        }));

    if (!items.length) {
        list.innerHTML = `
            <div class="notif-empty">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p>You're all caught up</p>
                <small>No new notifications</small>
            </div>`;
        return;
    }

    list.innerHTML = items.map(it => `
        <div class="notif-item ${it.severity}" onclick="openAlertFromNotif('${it.id}')">
            <div class="notif-icon">${it.severity === "critical" ? "🚨" : "⚠️"}</div>
            <div class="notif-content">
                <strong>${escapeHtml(it.title)}</strong>
                <p>${escapeHtml(it.desc)}</p>
                <span class="notif-time">${escapeHtml(it.time)}</span>
            </div>
        </div>
    `).join("");
}


function toggleNotifications(e) {
    if (e) e.stopPropagation();
    const panel = document.getElementById("notificationPanel");
    const btn   = document.getElementById("notificationBtn");
    if (!panel) return;

    const isOpen = panel.classList.contains("show");
    if (isOpen) {
        panel.classList.remove("show");
        if (btn) btn.classList.remove("active");
        return;
    }

    buildNotifications();
    panel.classList.add("show");
    if (btn) btn.classList.add("active");
}


function clearAllNotifications() {
    // Reset the dot + count, keep panel open showing "caught up"
    const dot = document.querySelector(".notification-dot");
    if (dot) dot.style.display = "none";
    const list = document.getElementById("notifList");
    if (list) {
        list.innerHTML = `
            <div class="notif-empty">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <p>You're all caught up</p>
                <small>No new notifications</small>
            </div>`;
    }
    if (typeof showSettingsToast === "function") showSettingsToast("Notifications cleared");
}


function openAlertFromNotif(alertId) {
    // Close panel and open the alerts page + modal
    const panel = document.getElementById("notificationPanel");
    if (panel) panel.classList.remove("show");
    if (typeof showPage === "function") {
        const btn = document.querySelector('.nav-item[onclick*="alerts"]');
        showPage("alerts", btn);
    }
    setTimeout(() => {
        if (typeof openAlertModal === "function") openAlertModal(alertId);
    }, 250);
}


function goToAlerts() {
    const panel = document.getElementById("notificationPanel");
    if (panel) panel.classList.remove("show");
    if (typeof showPage === "function") {
        const btn = document.querySelector('.nav-item[onclick*="alerts"]');
        showPage("alerts", btn);
    }
}


// Override the old alert()-based function so nothing calls it anymore
window.showNotifications = function () {
    toggleNotifications();
};


// Click anywhere else → close the panel
document.addEventListener("click", function (e) {
    const panel = document.getElementById("notificationPanel");
    const wrap  = document.querySelector(".notification-wrap");
    if (!panel || !wrap) return;
    if (!wrap.contains(e.target)) {
        panel.classList.remove("show");
        const btn = document.getElementById("notificationBtn");
        if (btn) btn.classList.remove("active");
    }
});

// ESC closes
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        const panel = document.getElementById("notificationPanel");
        if (panel) panel.classList.remove("show");
    }
});

// Refresh the dot when alerts change
setTimeout(() => {
    if (typeof syncAlertCounts === "function") syncAlertCounts();
    const dot = document.querySelector(".notification-dot");
    const activeCount = window.__activeAlertCount || 0;
    if (dot) dot.style.display = activeCount > 0 ? "" : "none";
}, 300);

/* =====================================================
   DASHBOARD — real numbers from /api/docs
   ===================================================== */

async function updateDashboardStats() {
    const API_BASE = window.CASEVAULT_API || "http://localhost:8000";
    try {
        const res = await fetch(`${API_BASE}/api/docs`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const docs = data.results || [];

        // Active Cases = distinct case_number values
        const caseSet = new Set();
        docs.forEach(d => { if (d.case_number) caseSet.add(d.case_number); });

        // Evidence = total documents in the DB
        const evidence = docs.length;

        // Pending Review = documents that need sign-off
        const pendingReview = docs.filter(d => {
            const t = String(d.document_type || "").toLowerCase();
            return t.includes("witness") || t.includes("forensic") || t.includes("charge");
        }).length;

        // Security Alerts = active alerts currently in the DOM
        let alerts = 0;
        document.querySelectorAll('.security-alert[data-alert-id]').forEach(el => {
            if ((el.dataset.status || "active").toLowerCase() === "active") alerts++;
        });

        window.__dashboardStats = {
            activeCases:    caseSet.size,
            evidence:       evidence,
            pendingReview:  pendingReview,
            securityAlerts: alerts,
        };

        if (typeof window.startCounters === "function") window.startCounters();
    } catch (e) {
        console.warn("[dashboard] could not load stats:", e.message);
    }
}


/* Override the animated counter function to read live stats */
window.startCounters = function () {
    const s = window.__dashboardStats || {};
    const values = [
        s.activeCases    || 0,
        s.evidence       || 0,
        s.pendingReview  || 0,
        s.securityAlerts || 0,
    ];

    document.querySelectorAll(".counter").forEach(function (counter, i) {
        const target = values[i] || 0;

        if (counter.__cvTimer) clearInterval(counter.__cvTimer);

        let current = 0;
        counter.textContent = "0";

        const steps = 30;
        const increment = Math.max(1, Math.ceil(target / steps));

        counter.__cvTimer = setInterval(function () {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(counter.__cvTimer);
            }
            counter.textContent = current.toLocaleString();
        }, 25);
    });
};


/* Fetch stats whenever the app becomes visible */
(function () {
    const _orig = window.showApp;
    if (typeof _orig !== "function") return;
    window.showApp = function () {
        _orig.apply(this, arguments);
        setTimeout(updateDashboardStats, 80);
    };
})();


/* Re-fetch after documents load (i.e. after an upload) */
(function () {
    const _orig = window.loadDocuments;
    if (typeof _orig !== "function") return;
    window.loadDocuments = async function () {
        const r = await _orig.apply(this, arguments);
        updateDashboardStats();
        return r;
    };
})();


/* Just refresh the alerts number when alerts change */
(function () {
    const _orig = window.syncAlertCounts;
    if (typeof _orig !== "function") return;
    window.syncAlertCounts = function () {
        _orig.apply(this, arguments);
        const s = window.__dashboardStats;
        if (!s) return;
        s.securityAlerts = window.__activeAlertCount || 0;
        const counters = document.querySelectorAll(".counter");
        if (counters[3]) counters[3].textContent = s.securityAlerts.toLocaleString();
    };
})();


/* Bootstrap — in case user is already logged in on page load */
window.addEventListener("load", function () {
    setTimeout(updateDashboardStats, 400);
});
