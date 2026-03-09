// ==========================================
// BOOKING MODAL - Integrado con Backend + Mercado Pago
// ==========================================

var bookingState = {
    step: 1,
    selectedDate: null,
    selectedTime: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    doctorId: null,
    doctorName: '',
    appointmentId: null,
    preferenceId: null,
    checkoutPro: null,
    availableDates: {}, // Cache de días con disponibilidad
    isTransitioning: false // Prevent double-clicks during transitions
};

var MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ==========================================
// MODAL OPEN / CLOSE
// ==========================================

async function openBookingModal() {
    var modal = document.getElementById("booking-modal");
    var backdrop = document.getElementById("booking-backdrop");
    var container = document.getElementById("booking-container");

    // Reset state
    bookingState.step = 1;
    bookingState.selectedDate = new Date();
    bookingState.selectedTime = null;
    bookingState.currentMonth = new Date().getMonth();
    bookingState.currentYear = new Date().getFullYear();
    bookingState.appointmentId = null;
    bookingState.preferenceId = null;

    // Load doctor info
    try {
        const response = await fetch(`${CONFIG.apiUrl}/book/${CONFIG.doctorSlug}`);
        const result = await response.json();
        
        if (result.success) {
            bookingState.doctorId = result.data.id;
            bookingState.doctorName = result.data.name;
        } else {
            console.error('Error loading doctor:', result.error);
            alert('Error al cargar información del doctor');
            return;
        }
    } catch (error) {
        console.error('Error fetching doctor:', error);
        alert('Error de conexión. Por favor verifica que el backend esté corriendo.');
        return;
    }

    // Reset form
    document.getElementById("booking-name").value = "";
    document.getElementById("booking-dni").value = "";
    document.getElementById("booking-phone").value = "";
    document.getElementById("booking-procedure").selectedIndex = 0;
    document.getElementById("booking-message").value = "";

    // Show modal
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    // Show step immediately (before animation)
    showStep(1);

    // Animate in — double rAF for reliable batch
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            backdrop.classList.remove("opacity-0");
            backdrop.classList.add("opacity-100");
            container.classList.remove("scale-95", "opacity-0");
            container.classList.add("scale-100", "opacity-100");
        });
    });

    // Defer calendar render so modal appears instantly
    setTimeout(function () { renderCalendar(); }, 50);
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
        
        // Cleanup Mercado Pago checkout
        if (bookingState.checkoutPro) {
            document.getElementById('mp-checkout-container').innerHTML = '';
            bookingState.checkoutPro = null;
        }
        
        if (paymentPollingInterval) {
            clearInterval(paymentPollingInterval);
            paymentPollingInterval = null;
        }
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

    // Setup specific step
    if (step === 3) {
        initMercadoPago();
    } else if (step === 4) {
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

async function bookingStep2Next() {
    validateStep2();
    var btn = document.getElementById("booking-step2-next");
    if (!btn || btn.disabled) {
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creando cita...';

    try {
        await createAppointment();
        bookingNextStep();
    } catch (error) {
        console.error('Error creating appointment:', error);
        
        // User-friendly error messages
        var errorMsg = 'Error al crear la cita. Por favor intenta de nuevo.';
        
        if (error.message.includes('Unique constraint failed')) {
            errorMsg = 'Este horario ya no está disponible. Por favor elige otro.';
            // Refresh slots to show updated availability
            renderTimeSlots();
        } else if (error.message.includes('no está dentro de la disponibilidad')) {
            errorMsg = 'El horario seleccionado no está dentro del horario de atención.';
        } else if (error.message.includes('no está disponible')) {
            errorMsg = 'Este horario ya está ocupado. Por favor elige otro.';
        }
        
        alert(errorMsg);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Programar Evento';
    }
}

// ==========================================
// CREATE APPOINTMENT
// ==========================================

async function createAppointment() {
    var name = document.getElementById("booking-name").value.trim();
    var dni = document.getElementById("booking-dni").value.trim();
    var phone = document.getElementById("booking-phone").value.trim();
    var procedure = document.getElementById("booking-procedure").value;
    var message = document.getElementById("booking-message").value.trim();

    // Calculate start and end datetime (local time)
    var year = bookingState.selectedDate.getFullYear();
    var month = bookingState.selectedDate.getMonth();
    var day = bookingState.selectedDate.getDate();
    var [hours, minutes] = bookingState.selectedTime.split(':');
    
    var startDateTime = new Date(year, month, day, parseInt(hours), parseInt(minutes), 0, 0);
    var endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + CONFIG.appointmentDuration);

    // Create appointment via backend
    const response = await fetch(`${CONFIG.apiUrl}/book/${CONFIG.doctorSlug}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            guestName: name,
            guestEmail: `${dni}@paciente.com`, // Email dummy basado en DNI
            guestPhone: phone,
            notes: `Procedimiento: ${procedure}\nMensaje: ${message || 'N/A'}`,
            startDatetime: startDateTime.toISOString(),
            endDatetime: endDateTime.toISOString()
        })
    });

    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Error creating appointment');
    }

    bookingState.appointmentId = result.data.id;

    // Create payment preference
    const paymentResponse = await fetch(`${CONFIG.apiUrl}/payments/create-preference`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            appointmentId: result.data.id,
            patientName: name,
            procedure: procedure,
            amount: CONFIG.appointmentPrice,
            patientEmail: `${dni}@paciente.com`
        })
    });

    const paymentResult = await paymentResponse.json();
    
    if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Error creating payment');
    }

    bookingState.preferenceId = paymentResult.data.preferenceId;
}

// ==========================================
// MERCADO PAGO CHECKOUT PRO
// ==========================================

function initMercadoPago() {
    var container = document.getElementById('mp-checkout-container');
    if (!container) {
        console.error('MP container not found');
        return;
    }

    container.innerHTML = '<div class="text-center py-8"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#dd4d4d] mx-auto"></div><p class="text-slate-600 mt-4">Cargando método de pago...</p></div>';

    // Initialize Mercado Pago
    const mp = new MercadoPago(CONFIG.mpPublicKey, {
        locale: 'es-PE'
    });

    // Create checkout
    bookingState.checkoutPro = mp.checkout({
        preference: {
            id: bookingState.preferenceId
        },
        render: {
            container: '#mp-checkout-container',
            label: 'Pagar consulta'
        }
    });

    // Start polling payment status
    startPaymentPolling();
}

var paymentPollingInterval = null;

function startPaymentPolling() {
    if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
    }

    paymentPollingInterval = setInterval(async () => {
        try {
            const response = await fetch(
                `${CONFIG.apiUrl}/payments/status/${bookingState.appointmentId}`
            );
            const result = await response.json();

            if (result.success && result.data.paymentStatus === 'PAID') {
                clearInterval(paymentPollingInterval);
                bookingNextStep(); // Go to confirmation
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        }
    }, 3000); // Check every 3 seconds
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
// CALENDAR RENDERING (RESPONSIVE IMPROVED + AVAILABILITY DOTS)
// ==========================================

async function renderCalendar() {
    bookingState.isTransitioning = true;
    
    var year = bookingState.currentYear;
    var month = bookingState.currentMonth;

    // Title
    document.getElementById("calendar-month-title").textContent = MONTH_NAMES[month] + " " + year;

    var container = document.getElementById("calendar-days");
    
    // Lock height to prevent collapse during transition
    var currentHeight = container.offsetHeight;
    if (currentHeight > 0) {
        container.style.minHeight = currentHeight + 'px';
    }
    
    // Smooth fade transition
    container.style.transition = 'opacity 0.2s ease-in-out';
    container.style.opacity = '0.4';
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    container.innerHTML = '';

    // Fetch available dates for this month
    var startDate = new Date(year, month, 1);
    var endDate = new Date(year, month + 1, 0);
    
    try {
        const response = await fetch(
            `${CONFIG.apiUrl}/book/${CONFIG.doctorSlug}/dates?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
        );
        const result = await response.json();
        
        if (result.success) {
            // Store availability info
            bookingState.availableDates = {};
            result.data.forEach(day => {
                bookingState.availableDates[day.date] = day.hasSlots;
            });
        }
    } catch (error) {
        console.error('Error loading availability:', error);
    }

    // Render calendar
    container.innerHTML = "";

    // Days
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var firstDay = new Date(year, month, 1).getDay();
    var blanks = firstDay === 0 ? 6 : firstDay - 1;

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
        var dateStr = formatDate(dayDate);
        var isPast = dayDate < today;
        var hasAvailability = bookingState.availableDates[dateStr] === true;
        var isSelected = bookingState.selectedDate &&
            bookingState.selectedDate.getDate() === d &&
            bookingState.selectedDate.getMonth() === month &&
            bookingState.selectedDate.getFullYear() === year;

        var wrapper = document.createElement("div");
        wrapper.className = "aspect-square flex items-center justify-center relative";

        var btn = document.createElement("button");
        btn.textContent = d;
        btn.disabled = isPast || !hasAvailability;

        if (isPast || !hasAvailability) {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold text-slate-300 cursor-not-allowed";
        } else if (isSelected) {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold bg-[#dd4d4d] text-white shadow-md shadow-red-500/30";
        } else {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-[#dd4d4d] transition-colors";
        }

        (function (day) {
            btn.addEventListener("click", function () {
                bookingState.selectedDate = new Date(year, month, day);
                bookingState.selectedTime = null;
                updateCalendarSelection(); // Solo actualizar selección
                renderTimeSlots();
                updateSidebar();
            });
        })(d);

        wrapper.appendChild(btn);
        container.appendChild(wrapper);
    }

    // Fade in the calendar
    requestAnimationFrame(function() {
        container.style.opacity = '1';
        // Remove height lock after transition
        setTimeout(function() {
            container.style.minHeight = '';
            bookingState.isTransitioning = false;
        }, 200);
    });

    // Show/hide time slots
    if (bookingState.selectedDate) {
        renderTimeSlots();
    }
}

// Helper: format date as YYYY-MM-DD
function formatDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Update calendar selection (without full re-render)
function updateCalendarSelection() {
    var container = document.getElementById("calendar-days");
    var buttons = container.querySelectorAll('button');
    
    buttons.forEach(function(btn) {
        if (btn.disabled) return;
        
        var day = parseInt(btn.textContent);
        var isSelected = bookingState.selectedDate &&
            bookingState.selectedDate.getDate() === day &&
            bookingState.selectedDate.getMonth() === bookingState.currentMonth &&
            bookingState.selectedDate.getFullYear() === bookingState.currentYear;
        
        if (isSelected) {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold bg-[#dd4d4d] text-white shadow-md shadow-red-500/30";
        } else {
            btn.className = "w-full aspect-square max-w-[36px] md:max-w-[44px] rounded-full flex items-center justify-center text-[11px] md:text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-[#dd4d4d] transition-colors";
        }
    });
}

// Update time slot selection (without full re-render)
function updateTimeSlotSelection() {
    var list = document.getElementById("time-slots-list");
    var buttons = list.querySelectorAll('button');
    
    buttons.forEach(function(btn) {
        var time = btn.textContent;
        var isSelected = bookingState.selectedTime === time;
        
        if (isSelected) {
            btn.className = "w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center bg-[#dd4d4d] border-[#dd4d4d] text-white";
        } else {
            btn.className = "w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center border-slate-200 text-[#dd4d4d] hover:border-[#dd4d4d] hover:border-2";
        }
    });
}

function calendarNextMonth() {
    if (bookingState.isTransitioning) return;
    
    bookingState.currentMonth++;
    if (bookingState.currentMonth > 11) {
        bookingState.currentMonth = 0;
        bookingState.currentYear++;
    }
    renderCalendar();
}

function calendarPrevMonth() {
    if (bookingState.isTransitioning) return;
    
    bookingState.currentMonth--;
    if (bookingState.currentMonth < 0) {
        bookingState.currentMonth = 11;
        bookingState.currentYear--;
    }
    renderCalendar();
}

// ==========================================
// TIME SLOTS (DYNAMIC FROM BACKEND)
// ==========================================

async function renderTimeSlots() {
    var container = document.getElementById("time-slots-container");
    var dateLabel = document.getElementById("time-slots-date");
    var list = document.getElementById("time-slots-list");

    var wasHidden = container.classList.contains("hidden");
    container.classList.remove("hidden");
    
    // Fade in container if it was hidden
    if (wasHidden) {
        container.style.opacity = '0';
        requestAnimationFrame(function() {
            container.style.transition = 'opacity 0.3s ease-out';
            container.style.opacity = '1';
        });
    }

    if (!bookingState.selectedDate) {
        dateLabel.textContent = "Selecciona una fecha";
        list.innerHTML = '<p class="text-slate-400 text-sm text-center py-8">Elige un dia en el calendario</p>';
        updateStep1Button();
        return;
    }

    dateLabel.textContent = bookingState.selectedDate.toLocaleDateString("es-ES", {
        weekday: "long", month: "long", day: "numeric"
    });

    list.innerHTML = '<div class="text-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#dd4d4d] mx-auto"></div></div>';

    // Fetch available slots from backend
    try {
        const dateStr = formatDate(bookingState.selectedDate);
        const response = await fetch(
            `${CONFIG.apiUrl}/book/${CONFIG.doctorSlug}/slots?date=${dateStr}`
        );
        const result = await response.json();

        console.log('📅 Slots recibidos del backend:', result.data.slots);

        list.style.opacity = '0';
        
        setTimeout(function() {
            list.innerHTML = "";

            if (!result.success || !result.data.slots || result.data.slots.length === 0) {
                list.innerHTML = '<p class="text-slate-400 text-sm text-center py-8">No hay horarios disponibles</p>';
                list.style.opacity = '1';
                updateStep1Button();
                return;
            }

            // Render slots with staggered animation
            console.log('🎨 Renderizando', result.data.slots.length, 'slots');
            result.data.slots.forEach(function (slot, index) {
                console.log('  ➡️ Slot', index + 1, ':', slot.startTime);
                var isSelected = bookingState.selectedTime === slot.startTime;

                var btn = document.createElement("button");
                btn.textContent = slot.startTime;

                if (isSelected) {
                    btn.className = "slot-animate w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center bg-[#dd4d4d] border-[#dd4d4d] text-white";
                } else {
                    btn.className = "slot-animate w-full py-2.5 md:py-3 rounded-lg border font-bold text-xs md:text-sm transition-all flex items-center justify-center border-slate-200 text-[#dd4d4d] hover:border-[#dd4d4d] hover:border-2";
                }

                // Staggered animation delay
                btn.style.animationDelay = (index * 0.05) + 's';

                btn.addEventListener("click", function () {
                    bookingState.selectedTime = slot.startTime;
                    updateTimeSlotSelection();
                    updateSidebar();
                    updateStep1Button();
                });

                list.appendChild(btn);
            });

            list.style.opacity = '1';
            updateStep1Button();
        }, 200);
    } catch (error) {
        console.error('Error loading slots:', error);
        list.innerHTML = '<p class="text-red-500 text-sm text-center py-8">Error al cargar horarios</p>';
        updateStep1Button();
    }
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

    // Setup WhatsApp notification button
    setupWhatsAppButton();
}

function setupWhatsAppButton() {
    var closeBtn = document.querySelector('#booking-step-4 button');
    if (closeBtn) {
        closeBtn.onclick = function() {
            sendWhatsAppNotification();
            closeBookingModal();
        };
        closeBtn.textContent = 'Notificar al Doctor';
        closeBtn.className = 'w-full bg-green-600 text-white py-4 rounded-xl font-bold transition-all shadow-lg text-sm hover:bg-green-700 flex items-center justify-center gap-2';
        closeBtn.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Notificar al Doctor
        `;
    }
}

function sendWhatsAppNotification() {
    var name = document.getElementById("booking-name").value;
    var dni = document.getElementById("booking-dni").value;
    var phone = document.getElementById("booking-phone").value;
    var procedure = document.getElementById("booking-procedure").value;

    var dateText = bookingState.selectedDate
        ? bookingState.selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "Sin fecha";
    var timeText = bookingState.selectedTime ? bookingState.selectedTime : "Sin hora";

    var fullMessage = [
        "✅ *Nueva cita confirmada y pagada*",
        "",
        "📅 *Fecha:* " + dateText,
        "🕐 *Hora:* " + timeText,
        "",
        "👤 *Paciente:* " + name,
        "🆔 *DNI:* " + dni,
        "📱 *Teléfono:* " + phone,
        "🏥 *Procedimiento:* " + procedure,
        "",
        "💳 *Estado:* Pago confirmado"
    ].join("\n");

    var url = "https://wa.me/" + CONFIG.whatsappNumber + "?text=" + encodeURIComponent(fullMessage);
    window.open(url, "_blank");
}
