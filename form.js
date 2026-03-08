document.getElementById("btn-enviar").addEventListener("click", function () {
    var nombre = document.getElementById("form-nombre").value.trim();
    var phone = document.getElementById("form-phone").value.trim();
    var consulta = document.getElementById("form-consulta").value.trim();

    if (!nombre || !phone || !consulta) {
        alert("RELLENA TODOS LOS CAMPOS QUE SE REQUIEREN");
        return;
    }

    var mensaje = "Hola, soy " + nombre + ".%0AMi número es: " + phone + ".%0AConsulta: " + consulta;

    var numeroWhatsApp = "922187254";

    var url = "https://api.whatsapp.com/send?phone=" + numeroWhatsApp + "&text=" + mensaje;

    window.open(url, "_blank");
});
