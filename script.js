document.addEventListener("DOMContentLoaded", function () {
    let fraudForm = document.getElementById("fraudForm");
    let bulkUploadBtn = document.getElementById("bulkUploadBtn");
    let authenticateBtn = document.getElementById("authBtn");

    if (fraudForm) fraudForm.addEventListener("submit", submitFraudForm);
    if (bulkUploadBtn) bulkUploadBtn.addEventListener("click", uploadBulkFile);
    if (authenticateBtn) authenticateBtn.addEventListener("click", authenticateSignature);
});

// 🟢 Function to Submit Fraud Form
async function submitFraudForm(event) {
    event.preventDefault();

    let formData = new FormData(event.target);
    let jsonData = {};

    formData.forEach((value, key) => {
        let numericFields = [
            "assured_age", "policy_sum_assured", "premium", "annual_income",
            "policy_term", "policy_payment_term", "bank_code"
        ];

        let dateFields = ["policy_risk_commencement_date", "date_of_death", "intimation_date"];

        if (numericFields.includes(key)) {
            jsonData[key] = parseFloat(value) || 0;
        } else if (dateFields.includes(key)) {
            jsonData[key] = value ? new Date(value).toISOString().split("T")[0] : null;
        } else {
            jsonData[key] = value.trim();
        }
    });

    console.log("🔍 Sending JSON Data:", JSON.stringify(jsonData, null, 2));

    try {
        let response = await fetch("http://13.203.216.161/model/predict/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${await response.text()}`);
        }

        let result = await response.json();
        console.log("✔️ Fraud Category:", result.prediction);

        // Update output and show response box
        const outputBox = document.getElementById("apiResponse");
        outputBox.innerHTML = `
            <h3>Fraud Detection Result</h3>
            <p>🔍 <strong>Category:</strong> ${result.prediction}</p>
        `;
        outputBox.style.display = "block";
    } catch (error) {
        console.error("❌ API Error:", error.message);

        const outputBox = document.getElementById("apiResponse");
        outputBox.innerHTML = `
            <h3 style="color:red;">❌ Error submitting form.</h3>
            <p>${error.message}</p>
        `;
        outputBox.style.display = "block";
    }
}




// 🟢 Function to Handle Bulk File Upload
async function uploadBulkFile() {
    const fileInput = document.getElementById("bulkUpload");
    const file = fileInput.files[0];
    const uploadStatus = document.getElementById("uploadStatus");
    const downloadLink = document.getElementById("downloadLink");

    if (!file) {
        uploadStatus.innerText = "❌ Please select a file.";
        downloadLink.style.display = "none";
        return;
    }

    const allowedExtensions = ["csv", "xls", "xlsx"];
    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
        uploadStatus.innerText = "❌ Invalid file type. Upload CSV/XLS/XLSX.";
        downloadLink.style.display = "none";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        uploadStatus.innerText = "⏳ Uploading and processing...";
        downloadLink.style.display = "none";
        document.getElementById("bulkUploadBtn").disabled = true;

        const uploadResponse = await fetch("http://13.203.216.161/model/predict_file/", {
            method: "POST",
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed: ${await uploadResponse.text()}`);
        }

        const downloadResponse = await fetch("http://13.203.216.161/model/download_file/", {
            method: "GET",
        });

        if (!downloadResponse.ok) {
            throw new Error(`Download failed: ${await downloadResponse.text()}`);
        }

        const contentType = downloadResponse.headers.get("Content-Type");
        console.log("📦 File content type:", contentType);

        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);

        downloadLink.href = url;

        if (contentType.includes("csv") || contentType.includes("text/plain")) {
            downloadLink.download = "Processed_File.csv";
        } else {
            downloadLink.download = "Processed_File.xlsx";
        }

        downloadLink.style.display = "inline-block";
        uploadStatus.innerText = "✅ File processed successfully! Click below to download.";
    } catch (error) {
        uploadStatus.innerText = "❌ Operation failed!";
        downloadLink.style.display = "none";
        alert("❌ Error: " + error.message);
    } finally {
        document.getElementById("bulkUploadBtn").disabled = false;
    }
}

document.getElementById("authBtn").addEventListener("click", authenticateSignature);

async function authenticateSignature() {
    const signatureUpload = document.getElementById("signatureUpload").files[0];
    const policyNumber = document.getElementById("policyNumber").value;

    const loadingSpinner = document.getElementById("loadingSpinner");
    const signatureResult = document.getElementById("signatureResult");

    if (!signatureUpload || !policyNumber) {
        Swal.fire("Error", "Please provide both policy number and signature.", "error");
        return;
    }

    // 🔄 Show the loading spinner
    loadingSpinner.style.display = "block";
    signatureResult.style.display = "none";

    const formData = new FormData();
    formData.append("reference_number", policyNumber);
    formData.append("image", signatureUpload);

    try {
        const response = await fetch("http://13.203.216.161/model/verify_signature/", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error("Server Error. Please try again.");
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        const similarityScore = result["Similarity score"] ?? "N/A";
        const matchStatus = result["Result"]?.toLowerCase() === "matched"
            ? "✅ Matched"
            : "❌ Not Matched";


        signatureResult.innerHTML = `
            <strong>Similarity Score:</strong> ${similarityScore}<br>
            <strong>Status:</strong> ${matchStatus}
        `;
        signatureResult.style.display = "block";

    } catch (err) {
        console.error("Signature verification error:", err);
        Swal.fire("Error", err.message || "Verification failed", "error");
    } finally {
        // ✅ Always hide the loader once done
        loadingSpinner.style.display = "none";
    }
}







