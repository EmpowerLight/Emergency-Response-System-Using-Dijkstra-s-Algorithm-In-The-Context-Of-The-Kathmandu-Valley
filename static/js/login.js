// Function to display messages and change text color
const displayMsg = (msg, id, colorname) => {
    const element = document.getElementById(id);
    element.innerHTML = msg;
    element.style.color = colorname;
};

// Function to validate email
const emailValidate = () => {
    const email = document.getElementById('email').value;
    if (email === '') {
        displayMsg('Email is mandatory', 'emailMsg', 'red');
        return false;
    } else if (!email.match(/^([a-z0-9])[a-z0-9\-\_\.]+\@+([a-z])+\.+([a-z])+$/)) {
        displayMsg('Invalid email format', 'emailMsg', 'red');
        return false;
    } else {
        displayMsg('', 'emailMsg', 'green');
        return true;
    }
};

// Function to validate password
const pwdValidate = () => {
    const password = document.getElementById('pwd').value;
    if (password === '') {
        displayMsg('Password is mandatory', 'pwdMsg', 'red');
        return false;
    } else if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$?!]).{8,100}$/)) {
        displayMsg('Weak password', 'pwdMsg', 'red');
        return false;
    } else {
        displayMsg('Password is strong', 'pwdMsg', 'green');
        return true;
    }
};

// Function to validate the entire form
const validForm = () => {
    if (emailValidate() && pwdValidate()) {
        console.log('Logged in');
        return true;
    } else {
        return false;
    }
};
