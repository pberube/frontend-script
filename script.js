const APP_VERSION = '0.0.2';

console.info(`App Version: ${APP_VERSION}`);

document.getElementById("launch-scan").addEventListener("click", async function (event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const fileInput = document.getElementById("sbom-file");
    const emailInput = document.getElementById("email");
    const userFeedback = document.getElementById('user-feedback');
    const checkUserKey = '1e817ad50a32161a1f0f8785c8daf3dac83923f659345795ddd93021b30c5755';

    if (!fileInput.files.length) {
        alert("Please select an SBOM file to scan.");
        return;
    }
    const file = fileInput.files[0]; // Get the selected file

    const email = emailInput.value.trim();
    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    try {
        // Call the GET /check-user endpoint with the required API key
        const response = await fetch(`https://sbom-scanner-353497251923.northamerica-northeast1.run.app/check-user?email=${encodeURIComponent(email)}`, {
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

        // Provide feedback !!
        userFeedback.textContent = 'Registration checking...';

        if (data.registered) {
            // If registered, call the POST endpoint
            const scanApiKey = data.key;
            
            // Create FormData to send email and file
            const formData = new FormData();
            formData.append('file', file);

            // Send the POST request to /start-scan
            const scanResponse = await fetch('https://sbom-scanner-353497251923.northamerica-northeast1.run.app/scan', {
                method: 'POST',
                headers: {
                    'X-API-Key': scanApiKey
                },
                body: formData,
            });

            if (scanResponse.ok) {
                const responseData = await scanResponse.json();

                userFeedback.textContent = 'Retrieving results...';

                // Update the summary section with the response data
                document.getElementById('total-vulns').textContent = responseData.summary.total;
                document.getElementById('impacted-items').textContent = responseData.details.length;
                document.getElementById('critical-vulns').textContent = responseData.summary.critical;
                document.getElementById('high-vulns').textContent = responseData.summary.high;
                document.getElementById('medium-vulns').textContent = responseData.summary.medium;
                document.getElementById('low-vulns').textContent = responseData.summary.low;

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
                            row.appendChild(vulnerabilityCell);
                        }

                        // Add other columns
                        row.innerHTML += `
                            <td>${vulnerability.severity}</td>
                            <td>${vulnerability["fixed-version"] || "N/A"}</td>
                            <td>${vulnerability.description}</td>
                        `;

                        // Append the row to the table body
                        tableBody.appendChild(row);
                    });
                });

                // Additional feedback for the user
                const rawResponse = JSON.stringify(responseData, null, 2);
                showSection("results");
                userFeedback.textContent = `Scan started successfully! Scan Data:\n${rawResponse}`;
            } else {
                const errorData = await scanResponse.json();
                console.error("Error details:", errorData);
                userFeedback.textContent = `Failed to start scan: ${errorData.detail || 'Unknown error'}`;
            }
        } else {
            // If not registered, prompt the user
            showSection("registration");
        }
    } catch (error) {

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
        showSection("scan-form"); // Simulating registration completion
    } catch (error) {
        console.error('Error:', error);
        userFeedback.textContent = 'An error occurred. Please try again.';
    }
});

function showSection(sectionId) {
    document.querySelectorAll("main > section").forEach(section => {
        section.classList.add("hidden");
    });
    document.getElementById(sectionId).classList.remove("hidden");
}
