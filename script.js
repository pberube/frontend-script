document.getElementById('sbom-scan-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent the form from submitting normally

    const email = document.getElementById('email').value;
    const formResponse = document.getElementById('form-response');
    const apiKey = '1e817ad50a32161a1f0f8785c8daf3dac83923f659345795ddd93021b30c5755';

    try {
        // Call the GET /check-user endpoint with the required API key
        const response = await fetch(`https://sbom-scanner-353497251923.northamerica-northeast1.run.app/check-user?email=${encodeURIComponent(email)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey, // Add the API key here
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch /check-user endpoint');
        }

        const data = await response.json();

        if (data.registered) {
            // If registered, call the POST endpoint
            const userApiKey = data.key;

            const scanResponse = await fetch('/start-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': userApiKey,
                },
                body: JSON.stringify({ email }),
            });

            if (scanResponse.ok) {
                formResponse.textContent = 'Scan successfully started!';
            } else {
                formResponse.textContent = 'Error starting scan.';
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
