/* Projects & Modal Logic */
const projects = [
    {
        title: "California Wildfires",
        desc: "California burns each year—how has fire intensity changed over time? Can satellites detect early signals before fires turn catastrophic? What role do climate shifts play in fueling these mega-fires?",
        link: "https://sherif-shallal.users.earthengine.app/view/nasaterramodisfirescalifornia"
    },
    {
        title: "Amazon Deforestation",
        desc: "The lungs of our planet are shrinking—how fast is the Amazon disappearing? Can satellite eyes reveal hidden patterns of deforestation? What if you could track forest loss in real time—would you act differently?",
        link: "https://sherif-shallal.users.earthengine.app/view/nasaterramodisndviamazon"
    },
    {
        title: "European Heat Waves",
        desc: "Europe is heating faster than expected—but how extreme are the changes? Can data from space help us measure the human cost of rising heat? What would a future summer in Europe look like if trends continue?",
        link: "https://sherif-shallal.users.earthengine.app/view/nasaterramodislsteurope"
    },
    {
        title: "New Zealand Snow Cover Decline",
        desc: "The white peaks of New Zealand are fading—how quickly is snow retreating? What does shrinking snow cover mean for water, wildlife, and tourism? Can long-term satellite monitoring help predict a snowless future?",
        link: "https://sherif-shallal.users.earthengine.app/view/nasaterramodissnownz"
    },
    {
        title: "Cairo Black Cloud",
        desc: "Each autumn, Cairo’s skies turn dark—what’s behind this “black cloud”? Can space-based data untangle the mix of pollution sources? What solutions emerge when we map air quality from above?",
        link: "https://sherif-shallal.users.earthengine.app/view/nasaterramodisaodcairo"
    },
    {
        title: "Indian Monsoons Variability",
        desc: "India’s lifeline, the monsoon, is becoming unpredictable—how variable is it? How do shifts in rainfall impact farmers and food security? Could satellite-driven forecasts help communities prepare better?",
        link: "https://sherif-shallal.users.earthengine.app/view/nasaterramodiscloudsindia"
    },
    {
        title: "Arabian Sea Phytoplankton",
        desc: "Tiny organisms, massive impact—how is phytoplankton reshaping the Arabian Sea? What do blooms mean for fisheries, carbon cycles, and climate? How can satellite monitoring reveal invisible changes beneath the waves?",
        link: "https://sherif-shallal.users.earthengine.app/view/nasaterramodischlorophyllaarabiansea"
    }
];

let currentProject = 0;
let animationRunning = true;
let angleOffset = 0;

function openProject(index) {
    currentProject = index;
    document.getElementById("modalTitle").innerText = projects[index].title;
    document.getElementById("modalDescription").innerText = projects[index].desc;
    document.getElementById("modalLink").href = projects[index].link;
    document.getElementById("projectModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("projectModal").style.display = "none";
}

function nextProject() {
    currentProject = (currentProject + 1) % projects.length;
    openProject(currentProject);
}

function prevProject() {
    currentProject = (currentProject - 1 + projects.length) % projects.length;
    openProject(currentProject);
}

function positionApps() {
    const container = document.querySelector(".apps-container");
    if (!container) return;
    const center = container.querySelector(".central-orb");
    const apps = container.querySelectorAll(".project-item");

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = 280;

    container.querySelectorAll(".connection-line").forEach(el => el.remove());

    apps.forEach((app, i) => {
        const angle = angleOffset + (i / apps.length) * (2 * Math.PI);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        app.style.left = x + "px";
        app.style.top = y + "px";

        const line = document.createElement("div");
        line.className = "connection-line";

        const dx = x - centerX;
        const dy = y - centerY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

        line.style.width = length + "px";
        line.style.left = centerX + "px";
        line.style.top = centerY + "px";
        line.style.transform = `rotate(${angleDeg}deg)`;

        container.appendChild(line);
    });
}

function animateApps() {
    if (animationRunning) {
        angleOffset += 0.002;
        positionApps();
    }
    requestAnimationFrame(animateApps);
}

window.addEventListener("load", () => {
    const container = document.querySelector(".apps-container");
    if (container) {
        positionApps();
        animateApps();

        const apps = document.querySelectorAll(".project-item");
        apps.forEach(app => {
            app.addEventListener("mouseenter", () => {
                animationRunning = false;
                container.classList.add("paused");
            });
            app.addEventListener("mouseleave", () => {
                animationRunning = true;
                container.classList.remove("paused");
            });
        });
    }
});

window.addEventListener("resize", positionApps);
