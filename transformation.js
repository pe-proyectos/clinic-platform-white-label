document.addEventListener("DOMContentLoaded", function () {

    // ==========================================
    // PROCEDURE TABS
    // ==========================================
    const botones = document.querySelectorAll(".btn-procedimiento");
    const secciones = document.querySelectorAll(".procedimiento-seccion");

    function updateTabs(activeBtn) {
        botones.forEach(function (btn) {
            btn.classList.remove("bg-[#dd4d4d]", "text-white", "border-[#dd4d4d]", "shadow-lg", "shadow-red-500/20", "scale-105");
            btn.classList.add("bg-white", "text-slate-500", "border-slate-200", "shadow-sm");
        });
        activeBtn.classList.remove("bg-white", "text-slate-500", "border-slate-200", "shadow-sm");
        activeBtn.classList.add("bg-[#dd4d4d]", "text-white", "border-[#dd4d4d]", "shadow-lg", "shadow-red-500/20", "scale-105");

        secciones.forEach(function (sec) {
            sec.classList.add("hidden");
        });

        var targetId = activeBtn.getAttribute("data-target");
        var targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove("hidden");
        }
    }

    // Initialize first tab
    if (botones.length > 0) {
        updateTabs(botones[0]);
    }

    botones.forEach(function (btn) {
        btn.addEventListener("click", function () {
            updateTabs(btn);
        });
    });


    // ==========================================
    // NAVBAR SCROLL EFFECT
    // ==========================================
    var navbar = document.getElementById("navbar");
    window.addEventListener("scroll", function () {
        if (window.scrollY > 50) {
            navbar.classList.add("bg-[#b83333]/90", "backdrop-blur-lg", "shadow-xl");
            navbar.classList.remove("bg-transparent");
            navbar.style.paddingTop = "0.35rem";
            navbar.style.paddingBottom = "0.35rem";
        } else {
            navbar.classList.remove("bg-[#b83333]/90", "backdrop-blur-lg", "shadow-xl");
            navbar.classList.add("bg-transparent");
            navbar.style.paddingTop = "0.5rem";
            navbar.style.paddingBottom = "0.5rem";
        }
    });


    // ==========================================
    // MOBILE MENU
    // ==========================================
    var menuBtn = document.getElementById("mobile-menu-btn");
    var mobileMenu = document.getElementById("mobile-menu");
    var menuIcon = document.getElementById("menu-icon");
    var closeIcon = document.getElementById("close-icon");
    var mobileLinks = document.querySelectorAll(".mobile-link");

    menuBtn.addEventListener("click", function () {
        mobileMenu.classList.toggle("hidden");
        menuIcon.classList.toggle("hidden");
        closeIcon.classList.toggle("hidden");
    });

    mobileLinks.forEach(function (link) {
        link.addEventListener("click", function () {
            mobileMenu.classList.add("hidden");
            menuIcon.classList.remove("hidden");
            closeIcon.classList.add("hidden");
        });
    });


    // ==========================================
    // SCROLL REVEAL ANIMATIONS
    // ==========================================
    var revealElements = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale");

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(function (el) {
        observer.observe(el);
    });

});