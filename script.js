document.getElementById('sbom-scan-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    document.getElementById('form-response').innerText = `Merci, nous traitons votre demande pour ${email}.`;
});
