// Below function Executes on click of login button.
function validate(){
	var username = document.getElementById("username").value;
	var password = document.getElementById("password").value;
	if(username.trim() == ""){		
		document.getElementById("error").innerHTML = "Please provide the userName";
		document.getElementById("error").style.display = 'block';
		document.getElementById("username").focus();
		return false;
	} else if(password.trim() == ""){
		document.getElementById("error").innerHTML = "Please provide the password";
		document.getElementById("error").style.display = 'block';
		document.getElementById("password").focus();
		return false;
	} else {
		document.getElementById("error").value = "";
		document.getElementById("error").style.display = 'none';
		return true;
	}
}