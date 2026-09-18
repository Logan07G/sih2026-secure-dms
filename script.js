// ================= LOGIN =================

function login() {

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please enter email and password.");
        return;
    }

    document.getElementById("loginScreen").classList.add("hidden");

    document.getElementById("app").classList.remove("hidden");

    startCounters();
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

function viewEvidence(fileName) {

    alert(
        "Secure Evidence Viewer\n\n" +
        "File: " + fileName + "\n\n" +
        "✓ SHA-256 Verified\n" +
        "✓ Chain-of-Custody Verified\n" +
        "✓ Access Authorized"
    );

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

function handleEvidenceFile(input) {

    if (!input.files || !input.files.length) {
        return;
    }

    selectedEvidence = input.files[0];

    const file = selectedEvidence;

    document
        .getElementById("selectedFileName")
        .textContent = file.name;

    document
        .getElementById("selectedFileSize")
        .textContent =
        formatFileSize(file.size);

    document
        .getElementById("selectedFile")
        .classList.remove("hidden");

    document
        .getElementById("securityOptions")
        .classList.remove("hidden");

    document
        .getElementById("uploadArea")
        .classList.add("hidden");

    document
        .getElementById("secureUploadBtn")
        .disabled = false;

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