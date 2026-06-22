/**
 * Register Page Handler
 * Submits the new account to POST /users/register (matches UserCreateRequest:
 * email, username, password -> 201 UserReadResponse) and sends the user to the
 * login page on success.
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    if (!form) return;

    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Disable the button to prevent duplicate submissions
        submitButton.disabled = true;
        submitButton.classList.add('loading');

        try {
            await apiRequest('/users/register', {
                method: 'POST',
                body: JSON.stringify({ email, username, password }),
            });

            // account created -> send them to the login page to sign in
            alert('Account created. You can now sign in.');
            window.location.href = '../index.html';
        } catch (error) {
            // apiRequest already logged the details, surface a message to the user
            alert(error.message || 'Registration failed. Please try again.');
        } finally {
            submitButton.disabled = false;
            submitButton.classList.remove('loading');
        }
    });
});
