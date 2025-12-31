const APP_VERSION = '0.0.3';

const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://sbom-scanner-353497251923.northamerica-northeast1.run.app";


console.info(`App Version: ${APP_VERSION}`);

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function resetSummarySection() {
    const ids = [ "total-vulns", "impacted-items", "critical-vulns",
                  "high-vulns", "medium-vulns", "low-vulns"];

    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = "0"; // Reset value to 0
        }
    });
}

function disableElementIds(elementIds) {
    elementIds.forEach(elementId => {
        elementId.disabled = true
    });
}

function enableElementIds(elementIds) {
    elementIds.forEach(elementId => {
        elementId.disabled = false
    });
}

document.querySelectorAll('input[name="scan-mode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    document.querySelectorAll('.scan-section').forEach(s => s.classList.add('hidden'));

    if (radio.value === 'sbom') {
      document.getElementById('sbom-section').classList.remove('hidden');
    }
    if (radio.value === 'component-ecosystem') {
      document.getElementById('component-ecosystem-section').classList.remove('hidden');
    }
  });
});

document.getElementById("sbom-file").addEventListener("change", async function () {
    const selectedFile = this.files[0]; // Get the first selected file
    const userFeedback = document.getElementById('user-feedback');
    
    if (selectedFile) {
        console.info(`Selected file: ${selectedFile.name}`);
    } else {
        console.info("No file selected.");
    }
    
    userFeedback.textContent = '';
    showSection(["scan-form", "user-feedback"]);
    resetSummarySection()
});

document.getElementById("launch-scan").addEventListener("click", async function (event) {
    const mode = document.querySelector('input[name="scan-mode"]:checked').value;
    event.preventDefault(); // Prevent the form from submitting normally

    const fileInput = document.getElementById("sbom-file");
    const emailInput = document.getElementById("email");
    const userFeedback = document.getElementById('user-feedback');
    const checkUserKey = '1e817ad50a32161a1f0f8785c8daf3dac83923f659345795ddd93021b30c5755';
    const component_name = document.getElementById('component-name').value.trim();
    const component_version = document.getElementById('component-version').value.trim();
    const ecosystem = document.getElementById('ecosystem').value;

    const file = mode === 'sbom'
        ? (fileInput.files.length ? fileInput.files[0] : null)
        : null;

    if (mode === 'sbom' && !file) {
        alert("Please select an SBOM file to scan.");
        return;
    }
    
    if (mode === 'component-ecosystem') {
        if (!component_name || !component_version) {
        alert("Please enter component name and version.");
        return;
        }
    }

    const email = emailInput.value.trim();
    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    disableElementIds([this, fileInput, emailInput]);
    showSection(["scan-form", "user-feedback"]);

    try {
        // Provide feedback !!
        userFeedback.textContent = 'Registration checking...';

        // Call the GET /check-user endpoint with the required API key
        const response = await fetch(`${API_BASE_URL}/check-user?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': checkUserKey
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch /check-user endpoint');
        }
        const data = await response.json();

        if (data.registered) {
            resetSummarySection()
            userFeedback.textContent = 'Retrieving results...';

            // If registered, call the POST endpoint
            const scanApiKey = data.key;

            let scanResponse = null;

            if (mode === 'sbom') {
                // Create FormData to send email and file
                const formData = new FormData();
                formData.append('file', file);

                // Send the POST request to /start-scan
                scanResponse = await fetch(`${API_BASE_URL}/scan`, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': scanApiKey
                    },
                    body: formData,
                });
            }
            else if (mode === 'component-ecosystem') {
                const payload = {
                    name: component_name,
                    version: component_version,
                    ecosystem: ecosystem
                };
                console.info("Payload:", payload);
                scanResponse = await fetch(`${API_BASE_URL}/scan-component`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': scanApiKey
                    },
                    body: JSON.stringify(payload),
                });
            }

            if (scanResponse && scanResponse.ok) {
                const responseData = await scanResponse.json();

                // Update the summary section with the response data
                document.getElementById('total-vulns').textContent = responseData.summary.total;
                document.getElementById('impacted-items').textContent = responseData.details.length;
                document.getElementById('critical-vulns').textContent = responseData.summary.critical;
                document.getElementById('high-vulns').textContent = responseData.summary.high;
                document.getElementById('medium-vulns').textContent = responseData.summary.medium;
                document.getElementById('low-vulns').textContent = responseData.summary.low;
                
                if (responseData.details.length > 0) {
                    // Populate the details table
                    const tableBody = document.querySelector("table tbody");
                    tableBody.innerHTML = ""; // Clear any existing rows

                    responseData.details.forEach(component => {
                        const vulnerabilities = component.vulnerabilities;
                        vulnerabilities.forEach((vulnerability, index) => {
                            // Create a new table row
                            const row = document.createElement("tr");

                            if (index === 0) {
                                // Create the merged cell for the first occurrence
                                const vulnerabilityCell = document.createElement("td");
                                vulnerabilityCell.textContent = `${component.name} (${component.version})`;
                                vulnerabilityCell.rowSpan = vulnerabilities.length; // Merge rows 
                                vulnerabilityCell.style.backgroundColor = "white";  // Force background coler fo items of first column
                                row.appendChild(vulnerabilityCell);
                            }

                            // Add other columns
                            row.innerHTML += `
                                <td>${vulnerability.severity}</td>
                                <td>${vulnerability["fixed-version"] || "N/A"}</td>
                                <td><a href="${vulnerability.source}" target="_blank">${escapeHTML(vulnerability.description)}</a></td>
                                <td>${vulnerability.cves && vulnerability.cves.length > 0
                                        ? vulnerability.cves
                                        .map(cve => `<a href="${cve.link}" target="_blank">${cve.id}</a>`)
                                        .join(", ")
                                        : "No Known CVE"}
                                </td>
                            `;

                            // Append the row to the table body
                            tableBody.appendChild(row);
                        });
                    });
              
                    showSection(["results"]);
                    userFeedback.textContent = `Scan completed successfully!`;
                }
                else {
                    userFeedback.textContent = `No vulnerabilities found.`;
                }
                enableElementIds([this, fileInput, emailInput]);
            } else {
                const errorData = await scanResponse.json();
                console.error("Error details:", errorData);
                userFeedback.textContent = `Failed to start scan: ${errorData.detail || 'Unknown error'}`;
                enableElementIds([this, fileInput, emailInput]);
            }
        } else {
            // If not registered, prompt the user
            showSection(["registration"]);
            enableElementIds([this, fileInput, emailInput]);
        }
    } catch (error) {
        enableElementIds([this, fileInput, emailInput]);
    }
});

document.getElementById("register-button").addEventListener("click", async function (event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const emailInput = document.getElementById("email");
    const userFeedback = document.getElementById('user-feedback');
    const regUserKey = '150f3255a4b68cf00182e0b020fc9cebd6a7f783fa3fcb177f459802310ef10e';
    
    const email = emailInput.value.trim();
    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    try {
        const registerResponse = await fetch('https://sbom-scanner-353497251923.northamerica-northeast1.run.app/send-registration-email', {
            method: 'POST',
            headers: {
                'X-API-Key': regUserKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email }),
        });

        if (registerResponse.ok) {
            alert("Registration email sent! Please check your inbox.");
        } else {
            userFeedback.textContent = 'Error sending registration email.';
        }
        showSection(["scan-form", "user-feedback"]); // Simulating registration completion
    } catch (error) {
        console.error('Error:', error);
        userFeedback.textContent = 'An error occurred. Please try again.';
    }
});

function showSection(sectionIds) {
    document.querySelectorAll("main > section").forEach(section => {
        section.classList.add("hidden");
    });

    // Show only the sections with IDs in the `sectionIds` array
    sectionIds.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.remove("hidden");
        }
    });
}
