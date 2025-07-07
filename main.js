import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
// TWEEN.js for animations
import TWEEN from 'https://unpkg.com/@tweenjs/tween.js@23.1.1/dist/tween.esm.js';

// --- Scene Setup ---
let scene, camera, renderer, controls, composer;
let outlinePass;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const objects = {}; // Store references to your 3D objects for interaction
let aiWaves = {}; // Specific object for AI layers
let currentActiveLayer = null;
let currentHoveredObject = null;
let animationFrameId; // To stop animation loop if needed

// DOM Elements
const infoOverlay = document.getElementById('info-overlay');
const overallStatsDiv = document.getElementById('overall-stats');
const aiTypeDetailsDiv = document.getElementById('ai-type-details');
const aiTypeHeadline = document.getElementById('ai-type-headline');
const aiTypeDescriptionText = document.getElementById('ai-type-description-text');
const aiTypeStatsDiv = document.getElementById('ai-type-stats');
const aiTypeFunctionsList = document.getElementById('ai-type-functions');
const loadingSpinner = document.getElementById('loading-spinner');

// --- Data (Updated to July 2025 where possible) ---
const financeData = {
    overall: {
        headline: "AI in Corporate Finance: The Future Unfolds",
        stats: [
            "**58%** of financial organizations using AI in 2024 (up from 37% in 2023).",
            "Global AI in Finance Market: **$38.36 Billion (2024)** projected to **$190.33 Billion (2030)** | **CAGR 30.6%**.",
            "**70%** of CFOs plan to increase AI investment in the next 5 years (Citizens Bank 2025 Report).",
            "**92%** of Fortune 500 companies** leverage OpenAI's technology (Sequencr AI, July 2025)."
        ]
    },
    automation: {
        headline: "Phase 1: General Automation (Foundation of Efficiency)",
        description: "AI-powered automation of repetitive, rule-based tasks. Focus on speed, cost reduction, and freeing up resources.",
        stats: [
            "**60%** of companies currently use automation solutions (Coherent Solutions).",
            "Up to **80%** of finance's transactional workflow** could be automated (Accenture estimate).",
            "Financial Automation Market CAGR: **14.2% (2024-2032)**.",
            "**63%** of CFOs say AI made payment automation *significantl y easier* (up 23% from 2024) (Citizens Bank 2025 Report)."
        ],
        functions: [
            "Accounts Payable/Receivable",
            "Financial Reporting/GL",
            "Basic Treasury Operations",
            "Invoice Processing",
            "Expense Categorization",
            "Compliance Checks",
            "Data Entry Automation",
            "Automated Reconciliation"
        ],
        color: 0x4CAF50, // Green
        emissiveColor: 0x2A7030, // Darker green for emissive
        label: "General Automation"
    },
    cognitive: {
        headline: "Phase 2: Cognitive AI (Unlocking Insights & Smarter Decisions)",
        description: "AI that learns, understands context, reasons, and predicts. Augments human intelligence for complex decision-making.",
        stats: [
            "Cognitive Computing Market CAGR: **28.4% (2025-2030)** (Grand View Research).",
            "BFSI leads adoption (25-28% market share) in cognitive computing.",
            "**91%** of US banks** use AI for fraud detection."
        ],
        functions: [
            "Predictive Forecasting",
            "Scenario Modeling",
            "Advanced Fraud Detection",
            "Credit Risk Assessment",
            "Market Risk Analysis",
            "M&A Due Diligence",
            "Dynamic Risk Scoring",
            "Portfolio Optimization"
        ],
        color: 0x2196F3, // Blue
        emissiveColor: 0x1565C0, // Darker blue for emissive
        label: "Cognitive AI"
    },
    generative: {
        headline: "Phase 3: Generative AI (Creative & Human-Like Interaction)",
        description: "AI that creates new text, images, code, etc., and supports natural language conversations.",
        stats: [
            "**65%** of organizations regularly use Generative AI (doubled 2023-2024) (McKinsey, AmplifAI).",
            "GenAI Market Value: **$66.62 Billion (2024)** projected to **$1.2 Trillion (next 9 years)**.",
            "**72%** of companies using or testing AI in financial reporting (KPMG).",
            "**99%** of companies expected to adopt AI auditing tools by 2027.",
            "**21%** of GenAI users report *fundamental workflow redesigns* (McKinsey)."
        ],
        functions: [
            "Narrative Reporting",
            "Budget Explanations",
            "Executive Summaries",
            "Audit Summaries",
            "Investor Presentations",
            "Earnings Call Scripts",
            "Policy Communications",
            "Personalized Financial Explanations"
        ],
        color: 0xFFC107, // Yellow
        emissiveColor: 0xFF8F00, // Darker yellow for emissive
        label: "Generative AI"
    }
};

// --- Initialization ---
function init() {
    showLoadingSpinner();
    const container = document.getElementById('webgl-container');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background for contrast

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Adjusted initial camera position to show all spheres
    camera.position.set(0, 8, 25); // X=0 for center, Y=8 for slightly above, Z=25 for further back

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: true for transparent background if needed
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // More cinematic look
    renderer.toneMappingExposure = 1;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 30; // Increased maxDistance to allow camera to be further back
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below the plane

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, 5, -5);
    scene.add(pointLight);

    // Post-processing (for outlines and better rendering)
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
    outlinePass.edgeStrength = 3;
    outlinePass.edgeGlow = 0.5;
    outlinePass.edgeThickness = 2;
    outlinePass.pulsePeriod = 2; // Pulsing effect
    outlinePass.visibleEdgeColor.set(0x00FF00); // Green outline
    outlinePass.hiddenEdgeColor.set(0x190A05);
    composer.addPass(outlinePass);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    composer.addPass(fxaaPass);

    loadModelsAndCreateScene(); // Asynchronous loading
    addEventListeners();
    updateInfoPanel(financeData.overall, true);
}

// --- Loading 3D Models ---
async function loadModelsAndCreateScene() {
    const gltfLoader = new GLTFLoader();

    try {
        // For simplicity, we'll keep the cube, but this is where you'd load a GLTF model
        // Example of loading a GLTF model:
        // const gltf = await gltfLoader.loadAsync('path/to/your/custom_finance_hub.glb');
        // objects.financeHub = gltf.scene;
        // objects.financeHub.position.set(0, 0, 0);
        // objects.financeHub.scale.set(0.5, 0.5, 0.5);
        // scene.add(objects.financeHub);

        // Fallback to simple cube if no GLTF model is provided/loaded
        createFinanceHub(); // Creates a simple cube for the hub

        createAIWaves();
        hideLoadingSpinner();
        animate(); // Start animation loop after models are loaded
    } catch (error) {
        console.error("Error loading 3D models:", error);
        // Fallback to simpler scene elements if loading fails
        createFinanceHub();
        createAIWaves();
        hideLoadingSpinner();
        animate();
    }
}

// --- Helper for creating Text Sprites ---
function createTextSprite(message, color = '#FFFFFF', fontSize = 60, fontFace = 'Arial') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const padding = 10; // Padding around text

    // Set font to measure text width
    context.font = `${fontSize}px ${fontFace}`;
    const metrics = context.measureText(message);
    const textWidth = metrics.width;
    const textHeight = fontSize; // Approximate height

    // Adjust canvas size based on text and padding
    canvas.width = textWidth + 2 * padding;
    canvas.height = textHeight + 2 * padding;

    // Redraw context with new canvas size
    context.font = `${fontSize}px ${fontFace}`;
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(message, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter; // Smoother scaling
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    // Scale sprite based on canvas dimensions to maintain aspect ratio
    const aspectRatio = canvas.width / canvas.height;
    const spriteHeight = 1; // Base height for the sprite in 3D units
    sprite.scale.set(spriteHeight * aspectRatio, spriteHeight, 1);

    return sprite;
}

// --- 3D Object Creation Functions ---

function createFinanceHub() {
    const geometry = new THREE.BoxGeometry(3, 3, 3); // Core Finance department
    const material = new THREE.MeshPhongMaterial({ color: 0x78909C, emissive: 0x30404C, emissiveIntensity: 0.7 });
    const hub = new THREE.Mesh(geometry, material);
    hub.name = "FinanceHub";
    scene.add(hub);
    objects.financeHub = hub;

    // Add a glowing effect to the hub
    const glowGeometry = new THREE.SphereGeometry(3.2, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    hub.add(glow);

    // Add label for Finance Hub
    // Adjusted position and scale to appear closer to the sphere
    const hubLabel = createTextSprite("Corporate Finance", '#E0E0E0', 60); // Smaller font size
    hubLabel.position.set(0, 1.8, 0); // Closer to the top surface of the cube
    hubLabel.scale.set(4, 1.5, 1); // Adjusted scale
    hub.add(hubLabel);
    objects.financeHubLabel = hubLabel;
}

function createAIWaves() {
    const baseRadius = 5;
    const thickness = 0.2;
    const segments = 100;
    const tubeSegments = 20;

    const types = ['automation', 'cognitive', 'generative'];
    types.forEach((type, index) => {
        const radius = baseRadius + (index * 2); // Increasing radii
        const geometry = new THREE.TorusGeometry(radius, thickness, tubeSegments, segments);
        const material = new THREE.MeshPhongMaterial({
            color: financeData[type].color,
            emissive: financeData[type].emissiveColor,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.1, // Start with low opacity
            side: THREE.DoubleSide
        });
        const wave = new THREE.Mesh(geometry, material);
        wave.rotation.x = Math.PI / 2; // Lay flat
        wave.name = `${type}Wave`;
        wave.userData.type = type;
        wave.visible = false; // Start invisible
        scene.add(wave);
        aiWaves[type] = wave;

        // Add label for each AI wave
        const waveLabel = createTextSprite(financeData[type].label, '#' + financeData[type].color.toString(16), 50);
        // Position the label slightly above the wave, rotated to face the camera
        waveLabel.position.set(radius + 1.5, 0.5, 0); // Offset from the torus
        waveLabel.scale.set(4, 1.5, 1); // Adjust scale for visibility
        wave.add(waveLabel);
        // Store label reference to control visibility
        wave.userData.label = waveLabel;


        // Add "impact points" (smaller spheres) to each wave
        const numPoints = financeData[type].functions.length; // Use the number of functions for points
        for (let i = 0; i < numPoints; i++) {
            const pointGeometry = new THREE.SphereGeometry(0.2, 16, 16);
            const pointMaterial = new THREE.MeshPhongMaterial({ color: financeData[type].color, emissive: financeData[type].color, emissiveIntensity: 0.8 });
            const point = new THREE.Mesh(pointGeometry, pointMaterial);
            const angle = (i / numPoints) * Math.PI * 2 + (Math.random() * 0.5 - 0.25); // Randomize angle slightly
            const pointRadius = radius + (Math.random() - 0.5) * 0.5; // Slight variation in distance
            point.position.set(
                pointRadius * Math.cos(angle),
                (Math.random() - 0.5) * 0.5, // Slight y variation
                pointRadius * Math.sin(angle)
            );
            point.name = `${type}Point${i}`;
            point.userData.isImpactPoint = true;
            point.userData.aiType = type;
            point.userData.detailIndex = i; // For linking to specific data if needed
            wave.add(point); // Attach points to the wave

            // Add label for each individual sphere (impact point)
            const pointLabelText = financeData[type].functions[i];
            const pointLabel = createTextSprite(pointLabelText, '#FFFFFF', 30); // Smaller font for point labels
            pointLabel.position.set(0, 0.65, 0); // Adjusted Y-position to clear the sphere
            pointLabel.scale.set(2, 0.7, 1); // Adjust scale for visibility
            pointLabel.visible = false; // Start invisible
            point.add(pointLabel);
            point.userData.label = pointLabel; // Store label reference
        }
    });
}

// --- UI & Interaction ---

function addEventListeners() {
    document.getElementById('btn-automation').addEventListener('click', () => showAIImpact('automation'));
    document.getElementById('btn-cognitive').addEventListener('click', () => showAIImpact('cognitive'));
    document.getElementById('btn-generative').addEventListener('click', () => showAIImpact('generative'));
    document.getElementById('btn-reset').addEventListener('click', resetView);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
}

function updateInfoPanel(data, isOverall = false) {
    if (isOverall) {
        overallStatsDiv.style.display = 'block';
        aiTypeDetailsDiv.style.display = 'none';

        overallStatsDiv.innerHTML = `
            <h2>${data.headline}</h2>
            ${data.stats.map(s => `<p class="stat-item"><span class="stat-value">${s}</span></p>`).join('')}
            <p style="margin-top: 20px;">Select an AI type below to explore its specific impact on corporate finance.</p>
        `;
    } else {
        overallStatsDiv.style.display = 'none';
        aiTypeDetailsDiv.style.display = 'block';

        aiTypeHeadline.textContent = data.headline;
        aiTypeDescriptionText.textContent = data.description;

        aiTypeStatsDiv.innerHTML = data.stats.map(s => `<div class="stat-item"><span class="stat-value">${s}</span></div>`).join('');
        aiTypeFunctionsList.innerHTML = data.functions.map(f => `<li>${f}</li>`).join('');
    }
}

function showAIImpact(type) {
    if (currentActiveLayer === type) return; // Prevent re-triggering if already active

    // Animate camera to focus on the selected layer
    const targetPosition = new THREE.Vector3();
    const wave = aiWaves[type];
    if (wave) {
        wave.getWorldPosition(targetPosition); // Get world position of the wave
        targetPosition.y += 2; // Move camera slightly above
        targetPosition.z += 5; // Move camera back

        new TWEEN.Tween(camera.position)
            .to(targetPosition, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        new TWEEN.Tween(controls.target)
            .to(wave.position, 1000) // Look at the wave's center
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }

    // Deactivate current layer
    if (currentActiveLayer && aiWaves[currentActiveLayer]) {
        const prevWave = aiWaves[currentActiveLayer];
        new TWEEN.Tween(prevWave.material)
            .to({ opacity: 0.1, emissiveIntensity: 0.3 }, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        prevWave.children.forEach(child => {
            if (child.userData.isImpactPoint) {
                new TWEEN.Tween(child.scale)
                    .to({ x: 1, y: 1, z: 1 }, 300)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
                if (child.userData.label) { // Hide point label
                    child.userData.label.visible = false;
                }
            }
        });
        if (prevWave.userData.label) {
            prevWave.userData.label.visible = false;
        }
    }

    // Activate new layer
    if (wave) {
        wave.visible = true;
        // Hide all point labels initially, then reveal them in succession
        wave.children.forEach(child => {
            child.visible = true; // Points themselves are visible
            if (child.userData.isImpactPoint && child.userData.label) {
                child.userData.label.visible = false; // Ensure labels start hidden
            }
        });

        new TWEEN.Tween(wave.material)
            .to({ opacity: 0.6, emissiveIntensity: 0.8 }, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        // Simple scale up animation for the wave itself
        new TWEEN.Tween(wave.scale)
            .to({ x: 1.05, y: 1.05, z: 1.05 }, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                 new TWEEN.Tween(wave.scale)
                    .to({ x: 1, y: 1, z: 1 }, 500)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
            })
            .start();

        // Show point labels in succession
        let delay = 0;
        const delayIncrement = 2000; // Milliseconds between each label appearing (2 seconds)
        // Filter for only impact points that have labels and sort them by angle for sequential appearance
        const pointsWithLabels = wave.children.filter(child => child.userData.isImpactPoint && child.userData.label)
                                            .sort((a, b) => {
                                                const angleA = Math.atan2(a.position.z, a.position.x);
                                                const angleB = Math.atan2(b.position.z, b.position.x);
                                                return angleA - angleB;
                                            });

        pointsWithLabels.forEach((point, index) => {
            setTimeout(() => {
                point.userData.label.visible = true;
                // Animate label scale from 0 to its normal size
                new TWEEN.Tween(point.userData.label.scale)
                    .from({ x: 0, y: 0, z: 0 })
                    .to({ x: 2, y: 0.7, z: 1 }, 300) // Scale to its normal size
                    .easing(TWEEN.Easing.Back.Out)
                    .start();
            }, delay);
            delay += delayIncrement;
        });

        updateInfoPanel(financeData[type]);
        currentActiveLayer = type;
    }
}

function resetView() {
    // Animate camera back to initial position
    new TWEEN.Tween(camera.position)
        .to({ x: 0, y: 8, z: 25 }, 1000) // Reset to new initial position (x=0, y=8, z=25)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    new TWEEN.Tween(controls.target)
        .to({ x: 0, y: 0, z: 0 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    // Fade out all waves and reset point scale
    for (const type in aiWaves) {
        const wave = aiWaves[type];
        if (wave) {
            new TWEEN.Tween(wave.material)
                .to({ opacity: 0.1, emissiveIntensity: 0.3 }, 500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => wave.visible = false)
                .start();
            wave.children.forEach(child => {
                if (child.userData.isImpactPoint) {
                    new TWEEN.Tween(child.scale)
                        .to({ x: 1, y: 1, z: 1 }, 300)
                        .easing(TWEEN.Easing.Quadratic.Out)
                        .start();
                    if (child.userData.label) { // Hide point label
                        child.userData.label.visible = false;
                    }
                }
            });
            if (wave.userData.label) {
                wave.userData.label.visible = false;
            }
        }
    }

    updateInfoPanel(financeData.overall, true);
    currentActiveLayer = null;
    outlinePass.selectedObjects = []; // Clear outline
    if (currentHoveredObject) {
        currentHoveredObject.material.emissive.setHex(currentHoveredObject.currentHex);
        currentHoveredObject = null;
    }
}

// --- Raycasting for Interaction ---
function onMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true); // true for recursive

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;

        // Only highlight impact points, and only on the active layer
        // Also ensure it's not the label itself, but the sphere
        const targetSphere = intersectedObject.userData.isImpactPoint ? intersectedObject : (intersectedObject.parent && intersectedObject.parent.userData.isImpactPoint ? intersectedObject.parent : null);

        if (targetSphere &&
            currentActiveLayer &&
            targetSphere.userData.aiType === currentActiveLayer) {

            if (currentHoveredObject != targetSphere) {
                if (currentHoveredObject) { // Reset previous hovered object
                    currentHoveredObject.material.emissive.setHex(currentHoveredObject.currentHex);
                    new TWEEN.Tween(currentHoveredObject.scale).to({ x: 1, y: 1, z: 1 }, 150).start();
                }
                currentHoveredObject = targetSphere;
                currentHoveredObject.currentHex = currentHoveredObject.material.emissive.getHex(); // Store original color
                currentHoveredObject.material.emissive.setHex(0xFFFFFF); // Highlight in white
                new TWEEN.Tween(currentHoveredObject.scale).to({ x: 1.2, y: 1.2, z: 1.2 }, 150).start(); // Scale up
                outlinePass.selectedObjects = [currentHoveredObject]; // Add to outline
            }
        } else {
            if (currentHoveredObject) { // If mouse moved off valid object
                currentHoveredObject.material.emissive.setHex(currentHoveredObject.currentHex);
                new TWEEN.Tween(currentHoveredObject.scale).to({ x: 1, y: 1, z: 1 }, 150).start();
                currentHoveredObject = null;
                outlinePass.selectedObjects = [];
            }
        }
    } else {
        if (currentHoveredObject) { // If mouse moved off any object
            currentHoveredObject.material.emissive.setHex(currentHoveredObject.currentHex);
            new TWEEN.Tween(currentHoveredObject.scale).to({ x: 1, y: 1, z: 1 }, 150).start();
            currentHoveredObject = null;
            outlinePass.selectedObjects = [];
        }
    }
}


// --- Animation Loop ---
function animate() {
    animationFrameId = requestAnimationFrame(animate);

    controls.update();
    TWEEN.update();

    // Rotate finance hub
    if (objects.financeHub) {
        objects.financeHub.rotation.y += 0.002;
    }

    // Animate points on active layer
    if (currentActiveLayer && aiWaves[currentActiveLayer]) {
        const wave = aiWaves[currentActiveLayer];
        wave.children.forEach((child, index) => {
            if (child.userData.isImpactPoint) {
                // Simple up-down animation for points
                child.position.y = Math.sin(Date.now() * 0.002 + index * 0.5) * 0.3;
            }
        });

        // Also add a subtle rotation to the active wave itself
        wave.rotation.z += 0.001; // Slow rotation
    }

    // Render the scene with post-processing
    composer.render();
}

// --- Helper Functions ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight); // Update composer size
    fxaaPass.material.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight); // Update FXAA
}

function showLoadingSpinner() {
    loadingSpinner.style.display = 'block';
}

function hideLoadingSpinner() {
    loadingSpinner.style.display = 'none';
}

// --- Start the experience ---
init();

