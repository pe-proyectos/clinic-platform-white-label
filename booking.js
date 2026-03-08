// ==========================================
// BOOKING MODAL
// ==========================================

var bookingState = {
    step: 1,
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
};

var MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

var TIME_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '16:00', '16:30', '17:00'];
var DOCTOR_WHATSAPP = "51904425498";

// ==========================================
// MODAL OPEN / CLOSE
// ==========================================

function openBookingModal() {
    var modal = document.getElementById("booking-modal");
    var backdrop = document.getElementById("booking-backdrop");
    var container = document.getElementById("booking-container");

    // Reset state
    bookingState.step = 1;
    bookingState.selectedDate = new Date();
    bookingState.selectedTime = null;
    bookingState.currentMonth = new Date().getMonth();
    bookingState.currentYear = new Date().getFullYear();

    // Reset form
    document.getElementById("booking-name").value = "";
    document.getElementById("booking-dni").value = "";
    document.getElementById("booking-phone").value = "";
    document.getElementById("booking-procedure").selectedIndex = 0;
    document.getElementById("booking-message").value = "";

    // Show modal
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Animate in
    requestAnimationFrame(function () {
        backdrop.classList.remove("opacity-0");
        backdrop.classList.add("opacity-100");
        container.classList.remove("scale-95", "opacity-0");
        container.classList.add("scale-100", "opacity-100");
    });

    showStep(1);
    renderCalendar();
}

function closeBookingModal() {
    var modal = document.getElementById("booking-modal");
    var backdrop = document.getElementById("booking-backdrop");
    var container = document.getElementById("booking-container");

    backdrop.classList.remove("opacity-100");
    backdrop.classList.add("opacity-0");
    container.classList.remove("scale-100", "opacity-100");
    container.classList.add("scale-95", "opacity-0");

    setTimeout(function () {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    }, 300);
}

// Close on backdrop click
document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "booking-backdrop") {
        closeBookingModal();
    }
});

// Close on Escape
document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        var modal = document.getElementById("booking-modal");
        if (!modal.classList.contains("hidden")) {
            closeBookingModal();
        }
    }
});

// ==========================================
// STEP NAVIGATION
// ==========================================

function showStep(step) {
    bookingState.step = step;

    for (var i = 1; i <= 4; i++) {
        var el = document.getElementById("booking-step-" + i);
        if (i === step) {
            el.classList.remove("hidden");
        } else {
            el.classList.add("hidden");
        }
    }

    // Back button
    var backBtn = document.getElementById("booking-back-btn");
    if (step > 1 && step < 4) {
        backBtn.classList.remove("hidden");
        backBtn.classList.add("flex");
    } else {
        backBtn.classList.add("hidden");
        backBtn.classList.remove("flex");
    }

    // Sidebar info
    updateSidebar();

    // If step 4, populate summary
    if (step === 4) {
        populateSummary();
    }
}

function bookingNextStep() {
    if (bookingState.step < 4) {
        showStep(bookingState.step + 1);
    }
}

function bookingPrevStep() {
    if (bookingState.step > 1) {
        showStep(bookingState.step - 1);
    }
}

function bookingStep2Next() {
    validateStep2();
    var btn = document.getElementById("booking-step2-next");
    if (!btn || btn.disabled) {
        return;
    }

    sendBookingToWhatsApp();
    bookingNextStep();
}

function sendBookingToWhatsApp() {
    var name = document.getElementById("booking-name").value.trim();
    var dni = document.getElementById("booking-dni").value.trim();
    var phone = document.getElementById("booking-phone").value.trim();
    var procedure = document.getElementById("booking-procedure").value;
    var message = document.getElementById("booking-message").value.trim();

    var dateText = bookingState.selectedDate
        ? bookingState.selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "Sin fecha";
    var timeText = bookingState.selectedTime ? bookingState.selectedTime : "Sin hora";

    var fullMessage = [
        "Hola doctor, nueva solicitud de cita:",
        "",
        "Fecha: " + dateText,
        "Hora: " + timeText,
        "Nombre: " + name,
        "DNI: " + dni,
        "Telefono: " + phone,
        "Procedimiento: " + procedure,
        "Mensaje: " + (message || "Sin mensaje adicional")
    ].join("\n");

    var url = "https://wa.me/" + DOCTOR_WHATSAPP + "?text=" + encodeURIComponent(fullMessage);
    window.open(url, "_blank");
}

// ==========================================
// SIDEBAR UPDATE
// ==========================================

function updateSidebar() {
    var dateEl = document.getElementById("sidebar-date");
    var dateText = document.getElementById("sidebar-date-text");
    var timeEl = document.getElementById("sidebar-time");
    var timeText = document.getElementById("sidebar-time-text");

    if (bookingState.selectedDate) {
        dateEl.classList.remove("hidden");
        dateEl.classList.add("flex");
        dateText.textContent = bookingState.selectedDate.toLocaleDateString("es-ES", {
            weekday: "long", month: "long", day: "numeric"
        });
    } else {
        dateEl.classList.add("hidden");
        dateEl.classList.remove("flex");
    }

    if (bookingState.selectedTime) {
        timeEl.classList.remove("hidden");
        timeEl.classList.add("flex");
        timeText.textContent = bookingState.selectedTime + " hrs";
    } else {
        timeEl.classList.add("hidden");
        timeEl.classList.remove("flex");
    }
}

// ==========================================
// CALENDAR RENDERING
// ==========================================

function renderCalendar() {
    var year = bookingState.currentYear;
    var month = bookingState.currentMonth;

    // Title
    document.getElementById("calendar-month-title").textContent = MONTH_NAMES[month] + " " + year;

    // Days
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var firstDay = new Date(year, month, 1).getDay();
    // Convert Sunday=0 to Monday-first: Mon=0, Tue=1, ... Sun=6
    var blanks = firstDay === 0 ? 6 : firstDay - 1;

    var container = document.getElementById("calendar-days");
    container.innerHTML = "";

    // Blank cells
    for (var b = 0; b < blanks; b++) {
        var blank = document.createElement("div");
        blank.className = "aspect-square";
        container.appendChild(blank);
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Day cells
    for (var d = 1; d <= daysInMonth; d++) {
        var dayDate = new Date(year, month, d);
        var isPast = dayDate < today;
        var isSelected = bookingState.selectedDate &&
            bookingState.selectedDate.getDate() === d &&
            bookingState.selectedDate.getMonth() === month &&
            bookingState.selectedDate.getFullYear() === year;

        var wrapper = document.createElement("div");
        wrapper.className = "aspect-square flex items-center justify-center";

        var btn = document.createElement("button");
        btn.textContent = d;
        btn.disabled = isPast;

        if (isPast) {
            btn.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-300 cursor-not-allowed";
        } else if (isSelected) {
            btn.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-[#dd4d4d] text-white shadow-md shadow-red-500/30";
        } else {
            btn.className = "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-[#dd4d4d] transition-colors";
        }

        (function (day) {
            btn.addEventListener("click", function () {
                bookingState.selectedDate = new Date(year, month, day);
                bookingState.selectedTime = null;
                renderCalendar();
                renderTimeSlots();
                updateSidebar();
            });
        })(d);

        wrapper.appendChild(btn);
        container.appendChild(wrapper);
    }

    // Show/hide time slots
    if (bookingState.selectedDate) {
        renderTimeSlots();
    }
}

function calendarNextMonth() {
    bookingState.currentMonth++;
    if (bookingState.currentMonth > 11) {
        bookingState.currentMonth = 0;
        bookingState.currentYear++;
    }
    renderCalendar();
}

function calendarPrevMonth() {
    bookingState.currentMonth--;
    if (bookingState.currentMonth < 0) {
        bookingState.currentMonth = 11;
        bookingState.currentYear--;
    }
    renderCalendar();
}

// ==========================================
// TIME SLOTS
// ==========================================

function renderTimeSlots() {
    var container = document.getElementById("time-slots-container");
    var dateLabel = document.getElementById("time-slots-date");
    var list = document.getElementById("time-slots-list");

    container.classList.remove("hidden");

    if (!bookingState.selectedDate) {
        dateLabel.textContent = "Selecciona una fecha";
        list.innerHTML = '<p class="text-slate-400 text-sm text-center py-8">Elige un dia en el calendario</p>';
        updateStep1Button();
        return;
    }

    dateLabel.textContent = bookingState.selectedDate.toLocaleDateString("es-ES", {
        weekday: "long", month: "long", day: "numeric"
    });

    list.innerHTML = "";

    TIME_SLOTS.forEach(function (time) {
        var isSelected = bookingState.selectedTime === time;

        var btn = document.createElement("button");
        btn.textContent = time;

        if (isSelected) {
            btn.className = "w-full py-2 rounded-lg border font-bold text-sm transition-all flex items-center justify-center bg-[#dd4d4d] border-[#dd4d4d] text-white";
        } else {
            btn.className = "w-full py-2 rounded-lg border font-bold text-sm transition-all flex items-center justify-center border-slate-200 text-[#dd4d4d] hover:border-[#dd4d4d] hover:border-2";
        }

        (function (t) {
            btn.addEventListener("click", function () {
                bookingState.selectedTime = t;
                renderTimeSlots();
                updateSidebar();
                updateStep1Button();
            });
        })(time);

        list.appendChild(btn);
    });

    updateStep1Button();
}

// ==========================================
// STEP 2 VALIDATION
// ==========================================

function validateStep2() {
    var name = document.getElementById("booking-name").value.trim();
    var dni = document.getElementById("booking-dni").value.trim();
    var phone = document.getElementById("booking-phone").value.trim();
    var procedure = document.getElementById("booking-procedure").value;
    var btn = document.getElementById("booking-step2-next");

    if (name && dni && phone && procedure) {
        btn.disabled = false;
    } else {
        btn.disabled = true;
    }
}

function updateStep1Button() {
    var btn = document.getElementById("booking-step1-next");
    if (!btn) {
        return;
    }

    if (bookingState.selectedDate && bookingState.selectedTime) {
        btn.classList.remove("hidden");
        btn.disabled = false;
    } else {
        btn.classList.add("hidden");
        btn.disabled = true;
    }
}

// Add listeners for validation
document.addEventListener("DOMContentLoaded", function () {
    var fields = ["booking-name", "booking-dni", "booking-phone", "booking-procedure"];
    fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", validateStep2);
            el.addEventListener("change", validateStep2);
        }
    });
});

// ==========================================
// SUMMARY (STEP 4)
// ==========================================

function populateSummary() {
    var name = document.getElementById("booking-name").value;
    var procedure = document.getElementById("booking-procedure").value;

    document.querySelector("#summary-name span").textContent = name;
    document.querySelector("#summary-procedure span").textContent = procedure;

    var dateStr = bookingState.selectedDate
        ? bookingState.selectedDate.toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" })
        : "";
    document.querySelector("#summary-datetime span").textContent = dateStr + " a las " + bookingState.selectedTime;
}
