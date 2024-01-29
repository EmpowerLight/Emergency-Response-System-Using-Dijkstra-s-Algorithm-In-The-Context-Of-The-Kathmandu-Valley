// Function to display messages
const displayMsg = (msg, id, colorname) => {
    const element = document.getElementById(id);
    element.innerHTML = msg;
    element.style.color = colorname;
};

// Validation functions
const nameValidate = (name, id) => {
    if (name === "") {
        displayMsg(`${id} is mandatory`, `${id}Msg`, 'red');
        return false;
    } else if (!name.match(/^[a-zA-Z]+$/)) {
        displayMsg(`${id} must contain alphabets only`, `${id}Msg`, 'red');
        return false;
    } else if (name.length < 3) {
        displayMsg(`${id} must be more than 2 characters`, `${id}Msg`, 'red');
        return false;
    } else {
        displayMsg('', `${id}Msg`, 'green');
        return true;
    }
};

const emailValidate = () => {
    const email = document.getElementById('email').value;
    if (email === "") {
        displayMsg('Email is mandatory', 'emailMsg', 'red');
        return false;
    } else if (!email.match(/^[a-z0-9][a-z0-9\-_.]+@[a-z]+\.[a-z]+$/)) {
        displayMsg('Invalid email format', 'emailMsg', 'red');
        return false;
    } else {
        displayMsg(' ', 'emailMsg', 'green');
        return true;
    }
};

const phoneValidate = () => {
    const phone = document.getElementById('phone').value;
    if (phone === "") {
        displayMsg('Phone number is mandatory', 'phoneMsg', 'red');
        return false;
    } else if (!phone.match(/^98\d{8}$/)) {
        displayMsg('Invalid phone number format', 'phoneMsg', 'red');
        return false;
    } else {
        displayMsg(' ', 'phoneMsg', 'green');
        return true;
    }
};

const pwdValidate = () => {
    const password = document.getElementById('pwd').value;
    if (password === "") {
        displayMsg('Password is mandatory', 'pwdMsg', 'red');
        return false;
    } else if (!password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$?!]).{8,100}$/)) {
        displayMsg('Weak password must be greater than 8 characters, contain a number and special character', 'pwdMsg', 'red');
        return false;
    } else {
        displayMsg('Password is strong', 'pwdMsg', 'green');
        return true;
    }
};

const validForm = () => {
    if (nameValidate(document.getElementById('fname').value, 'First name') &&
        nameValidate(document.getElementById('lname').value, 'Last name') &&
        emailValidate() &&
        phoneValidate() &&
        pwdValidate()) {
        console.log("Registered");
        return true;
    } else {
        return false;
    }
};
