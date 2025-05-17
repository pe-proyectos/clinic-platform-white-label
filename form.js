document.getElementById("btn-enviar").addEventListener("click", function(){
    const nombre = document.getElementById("form-nombre").value;
    const dni = document.getElementById("form-dni").value;
    const procedimiento = document.getElementById("opcion-select").value;
    const consulta = document.getElementById("form-consulta").value;

    if(!nombre || !dni || procedimiento === "ELIGE TU PROCEDIMIENTO" || !consulta){
        alert("RELLENA TODOS LOS CAMPOS QUE SE REQUIEREN")
        return;
    }

    const mensaje = `Hola, soy ${nombre}.%0AMi número de DNI es: ${dni}.%0AQuisiera agendar una cita para: ${procedimiento}.%0AMis dudas o consulta: ${consulta}`;

    const numeroWhatsApp = "904425498";

    const url = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${mensaje}`;

    window.open(url, "_blank");
});