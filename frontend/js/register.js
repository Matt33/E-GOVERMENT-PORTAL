/**
 * register.js — Uses window.EgovAuth for dynamic API base URL.
 * Requires auth.js to be loaded first.
 */
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('alertBox');
    const btn = document.getElementById('regBtn');

    const data = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };

    btn.disabled = true;
    btn.innerText = 'Creating account...';

    try {
        const res = await window.EgovAuth.apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (res.ok) {
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('successCard').style.display = 'block';
            if (alertBox) alertBox.style.display = 'none';
        } else {
            const err = await res.json().catch(function () { return {}; });
            if (alertBox) {
                alertBox.innerText = err.message || 'Registration failed';
                alertBox.className = 'alert alert-error';
                alertBox.style.display = 'block';
            }
        }
    } catch (err) {
        if (alertBox) {
            alertBox.innerText = 'Cannot connect to server. Check if NestJS is running.';
            alertBox.className = 'alert alert-error';
            alertBox.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        btn.innerText = 'Register';
    }
});
