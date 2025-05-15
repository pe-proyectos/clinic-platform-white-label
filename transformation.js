document.addEventListener("DOMContentLoaded", function () {
    const botones = document.querySelectorAll(".btn-procedimiento");
    const secciones = document.querySelectorAll(".procedimiento-seccion");

    secciones.forEach((sec, i) => {
      if (i === 0) {
        sec.classList.remove("hidden");
      } else {
        sec.classList.add("hidden");
      }
    });

    botones.forEach((btn, i) => {
      if (i === 0) {
        btn.classList.add("bg-red-200");
      } else {
        btn.classList.remove("bg-red-200");
      }
    });

    botones.forEach((button, index) => {
      button.addEventListener("click", () => {
        secciones.forEach((sec) => sec.classList.add("hidden"));
        secciones[index].classList.remove("hidden");

        botones.forEach((btn) => btn.classList.remove("bg-red-200"));
        button.classList.add("bg-red-200");
      });
    });
  });