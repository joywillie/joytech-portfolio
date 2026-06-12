// ===============================
// JOYTECH FRONTEND SCRIPT
// ===============================


// LOGOUT

const logoutBtn = document.getElementById("logoutBtn");


if(logoutBtn){

logoutBtn.addEventListener("click",()=>{


localStorage.removeItem("joytech_token");


window.location.href="/auth";


});


}




// CONTACT FORM


const form = document.getElementById("contact-form");


if(form){


form.addEventListener("submit", async(e)=>{


e.preventDefault();



const button =
form.querySelector("button");


button.innerText="Sending...";
button.disabled=true;



const data={

name:form.name.value,

email:form.email.value,

service:form.service.value,

message:form.message.value

};





try{


const response =
await fetch("/api/contact",{


method:"POST",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify(data)



});




const result =
await response.json();




if(response.ok){


const popup =
document.getElementById("successPopup");



popup.style.display="block";



setTimeout(()=>{


popup.style.display="none";


},4000);




form.reset();



}else{


alert(result.error || "Message failed");


}




}catch(error){


alert("Server connection error");


}





button.innerText="Send Message";

button.disabled=false;




});


}
