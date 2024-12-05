document.getElementById('sbom-scan-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const formResponse = document.getElementById('form-response');
    const email = document.getElementById('email').value;
    const fileInput = document.getElementById('sbom-file');
    const file = fileInput.files[0]; // Get the selected file
    const checkUserKey = '1e817ad50a32161a1f0f8785c8daf3dac83923f659345795ddd93021b30c5755';

    if (!file) {
        formResponse.textContent = 'Please select a file to upload.';
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
        formResponse.textContent = 'Registration checking...';

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
                const rawResponse = JSON.stringify(responseData, null, 2);
                formResponse.textContent = `Scan started successfully! Scan Data:\n${rawResponse}`;
            } else {
                const errorData = await scanResponse.json();
                console.error("Error details:", errorData);
                formResponse.textContent = `Failed to start scan: ${errorData.detail || 'Unknown error'}`;
            }
        } else {
            // If not registered, prompt the user
            const wantsToRegister = confirm('You are not registered. Would you like to register?');
            if (wantsToRegister) {
                const registerResponse = await fetch('/send-registration-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                if (registerResponse.ok) {
                    formResponse.textContent = 'Registration email sent!';
                } else {
                    formResponse.textContent = 'Error sending registration email.';
                }
            } else {
                formResponse.textContent = 'Registration canceled.';
            }
        }
    } catch (error) {
        console.error('Error:', error);
        formResponse.textContent = 'An error occurred. Please try again.';
    }
});
