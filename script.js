const SUPABASE_URL = "https://mhazmajqpihsujncbntq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5fM3v1eldBoqS0WnGrrRJQ_iUuObskn";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

let currentUser = null;

let sets = [];

let selectedWorkoutType = "";
let manageSelectedWorkoutType = "Upper";
let sortOrder = "newest";
let editingSetId = null;
let isBodyweight = false;
let isPasswordRecovery = false;

let exerciseLists = {
    Upper: [],
    Lower: [],
    Core: []
};

/* =========================
   AUTH
========================= */

async function signUp() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please enter email and password");
        return;
    }

    const { error } = await supabaseClient.auth.signUp({
        email: email,
        password: password
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Account created. Check your email if confirmation is required.");
}

async function signIn() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (email === "" || password === "") {
        alert("Please enter email and password");
        return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert(error.message);
        return;
    }

    isPasswordRecovery = false;
    currentUser = data.user;

    document.getElementById("authPage").style.display = "none";
    document.getElementById("resetPasswordPage").style.display = "none";
    document.getElementById("appPage").style.display = "block";

    setDefaultDate();
    selectUpper();
    selectManageWorkoutType("Upper");

    await loadWorkoutSets();
    await loadExerciseLists();

    showLoggerPage();
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        alert(error.message);
        return;
    }

    currentUser = null;
    sets = [];
    exerciseLists = {
        Upper: [],
        Lower: [],
        Core: []
    };

    isPasswordRecovery = false;
    setBodyweightMode(false);

    document.getElementById("authPage").style.display = "block";
    document.getElementById("resetPasswordPage").style.display = "none";
    document.getElementById("appPage").style.display = "none";
}

async function checkSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        alert(error.message);
        return;
    }

    if (data.session === null) {
        document.getElementById("authPage").style.display = "block";
        document.getElementById("resetPasswordPage").style.display = "none";
        document.getElementById("appPage").style.display = "none";
        return;
    }

    if (isPasswordRecovery === true) {
        document.getElementById("authPage").style.display = "none";
        document.getElementById("appPage").style.display = "none";
        document.getElementById("resetPasswordPage").style.display = "block";
        return;
    }

    currentUser = data.session.user;

    document.getElementById("authPage").style.display = "none";
    document.getElementById("resetPasswordPage").style.display = "none";
    document.getElementById("appPage").style.display = "block";

    setDefaultDate();
    selectUpper();
    selectManageWorkoutType("Upper");

    await loadWorkoutSets();
    await loadExerciseLists();

    showLoggerPage();
}

async function sendPasswordReset() {
    const email = document.getElementById("email").value;

    if (email === "") {
        alert("Please enter your email first");
        return;
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Password reset email sent. Check your inbox.");
}

async function updatePassword() {
    const newPassword = document.getElementById("newPassword").value;

    if (newPassword === "") {
        alert("Please enter a new password");
        return;
    }

    if (newPassword.length < 6) {
        alert("Password should be at least 6 characters");
        return;
    }

    const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Password updated. Please log in again.");

    await supabaseClient.auth.signOut();

    currentUser = null;
    sets = [];
    isPasswordRecovery = false;

    document.getElementById("newPassword").value = "";
    document.getElementById("resetPasswordPage").style.display = "none";
    document.getElementById("authPage").style.display = "block";
    document.getElementById("appPage").style.display = "none";
}

/* =========================
   PAGE NAVIGATION
========================= */

function showLoggerPage() {
    document.getElementById("loggerPage").style.display = "block";
    document.getElementById("manageExercisesPage").style.display = "none";

    renderExerciseDropdown();
    renderPreviousWorkouts();
    renderSets();
}

function showManageExercisesPage() {
    document.getElementById("loggerPage").style.display = "none";
    document.getElementById("manageExercisesPage").style.display = "block";

    renderExerciseList();
}

/* =========================
   DATE / SORT
========================= */

function toggleSortOrder() {
    if (sortOrder === "newest") {
        sortOrder = "oldest";
    } else {
        sortOrder = "newest";
    }

    renderSets();
}

function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function setDefaultDate() {
    const dateInput = document.getElementById("workoutDate");
    const today = getTodayDate();

    dateInput.value = today;
    dateInput.max = today;
}

function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

/* =========================
   QUICK INPUT HELPERS
========================= */

function setReps(value) {
    document.getElementById("reps").value = value;
}

function toggleBodyweight() {
    setBodyweightMode(!isBodyweight);
}

function setBodyweightMode(value) {
    const weightInput = document.getElementById("weight");
    const bodyweightButton = document.getElementById("bodyweightButton");

    if (weightInput === null || bodyweightButton === null) {
        return;
    }

    isBodyweight = value;

    if (isBodyweight === true) {
        weightInput.value = "";
        weightInput.disabled = true;
        weightInput.placeholder = "Bodyweight";
        bodyweightButton.classList.add("active-button");
    } else {
        weightInput.disabled = false;
        weightInput.placeholder = "Weight kg";
        bodyweightButton.classList.remove("active-button");
    }
}

function turnOffBodyweight() {
    const weightInput = document.getElementById("weight");

    if (weightInput.value !== "") {
        setBodyweightMode(false);
    }
}

function formatWeightAndReps(weight, reps) {
    if (weight === "BW") {
        return `BW x ${reps}`;
    }

    return `${weight}kg x ${reps}`;
}

/* =========================
   WORKOUT TYPE SELECTION
========================= */

function selectUpper() {
    selectedWorkoutType = "Upper";
    renderExerciseDropdown();
}

function selectLower() {
    selectedWorkoutType = "Lower";
    renderExerciseDropdown();
}

function selectCore() {
    selectedWorkoutType = "Core";
    renderExerciseDropdown();
}

function renderExerciseDropdown() {
    const exerciseDropdown = document.getElementById("exercise");

    exerciseDropdown.innerHTML = "";

    if (selectedWorkoutType === "") {
        return;
    }

    const exercises = exerciseLists[selectedWorkoutType] || [];

    exercises.forEach(function(exercise) {
        const option = document.createElement("option");
        option.value = exercise;
        option.textContent = exercise;
        exerciseDropdown.appendChild(option);
    });

    renderPreviousWorkouts();
}

/* =========================
   SUPABASE WORKOUT SETS
========================= */

async function loadWorkoutSets() {
    const { data, error } = await supabaseClient
        .from("workout_sets")
        .select("*")
        .order("workout_date", { ascending: false });

    if (error) {
        alert(error.message);
        return;
    }

    sets = data.map(function(row) {
        return {
            id: row.id,
            date: row.workout_date,
            workoutType: row.workout_type,
            exercise: row.exercise,
            weight: row.weight,
            reps: row.reps
        };
    });

    renderSets();
    renderPreviousWorkouts();
}

async function addSet() {
    const exercise = document.getElementById("exercise").value;
    const workoutDate = document.getElementById("workoutDate").value;
    const weightInput = document.getElementById("weight").value;
    const reps = document.getElementById("reps").value;

    const weight = isBodyweight === true ? "BW" : weightInput;

    if (currentUser === null) {
        alert("Please sign in first");
        return;
    }

    if (selectedWorkoutType === "" || exercise === "" || workoutDate === "" || reps === "") {
        alert("Please fill in exercise, date and reps");
        return;
    }

    if (isBodyweight === false && weightInput === "") {
        alert("Please enter a weight or select BW");
        return;
    }

    if (Number(reps) <= 0) {
        alert("Reps must be more than 0");
        return;
    }

    if (isBodyweight === false && Number(weightInput) < 0) {
        alert("Weight cannot be negative");
        return;
    }

    if (workoutDate > getTodayDate()) {
        alert("You cannot log a workout for a future date");
        return;
    }

    if (editingSetId === null) {
        const { error } = await supabaseClient
            .from("workout_sets")
            .insert({
                user_id: currentUser.id,
                workout_date: workoutDate,
                workout_type: selectedWorkoutType,
                exercise: exercise,
                weight: weight,
                reps: reps
            });

        if (error) {
            alert(error.message);
            return;
        }
    } else {
        const { error } = await supabaseClient
            .from("workout_sets")
            .update({
                workout_date: workoutDate,
                workout_type: selectedWorkoutType,
                exercise: exercise,
                weight: weight,
                reps: reps
            })
            .eq("id", editingSetId);

        if (error) {
            alert(error.message);
            return;
        }

        editingSetId = null;
        document.getElementById("setButton").textContent = "Add Set";
    }

    if (isBodyweight === false) {
        document.getElementById("weight").value = "";
    }

    document.getElementById("reps").value = "";

    await loadWorkoutSets();

    renderPreviousWorkouts();
}

async function deleteSet(id) {
    const confirmDelete = confirm("Delete this set?");

    if (confirmDelete === false) {
        return;
    }

    const { error } = await supabaseClient
        .from("workout_sets")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    if (editingSetId === id) {
        editingSetId = null;
        document.getElementById("setButton").textContent = "Add Set";
        document.getElementById("weight").value = "";
        document.getElementById("reps").value = "";
        setBodyweightMode(false);
    }

    await loadWorkoutSets();

    renderPreviousWorkouts();
}

function editSet(id) {
    const setToEdit = sets.find(function(set) {
        return set.id === id;
    });

    if (setToEdit === undefined) {
        alert("Set not found");
        return;
    }

    editingSetId = id;

    selectedWorkoutType = setToEdit.workoutType;
    renderExerciseDropdown();

    document.getElementById("exercise").value = setToEdit.exercise;
    document.getElementById("workoutDate").value = setToEdit.date;
    document.getElementById("reps").value = setToEdit.reps;

    if (setToEdit.weight === "BW") {
        setBodyweightMode(true);
    } else {
        setBodyweightMode(false);
        document.getElementById("weight").value = setToEdit.weight;
    }

    document.getElementById("setButton").textContent = "Save Edit";

    showLoggerPage();
    renderPreviousWorkouts();
}

/* =========================
   SUPABASE EXERCISE LISTS
========================= */

async function loadExerciseLists() {
    const { data, error } = await supabaseClient
        .from("exercise_lists")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        alert(error.message);
        return;
    }

    exerciseLists = {
        Upper: [],
        Lower: [],
        Core: []
    };

    data.forEach(function(row) {
        if (exerciseLists[row.workout_type] !== undefined) {
            exerciseLists[row.workout_type].push(row.exercise_name);
        }
    });

    if (
        exerciseLists.Upper.length === 0 &&
        exerciseLists.Lower.length === 0 &&
        exerciseLists.Core.length === 0
    ) {
        const createdDefaults = await createDefaultExercises();

        if (createdDefaults === true) {
            await loadExerciseLists();
        }

        return;
    }

    renderExerciseDropdown();
    renderExerciseList();
}

async function createDefaultExercises() {
    const defaultExercises = [
        { workout_type: "Upper", exercise_name: "Pullups" },
        { workout_type: "Upper", exercise_name: "Bench Press" },
        { workout_type: "Upper", exercise_name: "Lateral Raises" },
        { workout_type: "Upper", exercise_name: "Shoulder Press" },
        { workout_type: "Upper", exercise_name: "Pullovers" },
        { workout_type: "Upper", exercise_name: "Curls" },

        { workout_type: "Lower", exercise_name: "Squats" },
        { workout_type: "Lower", exercise_name: "Leg Extension" },
        { workout_type: "Lower", exercise_name: "Leg Curls" },
        { workout_type: "Lower", exercise_name: "Calf Raises" },

        { workout_type: "Core", exercise_name: "Plank" },
        { workout_type: "Core", exercise_name: "Sit Ups" },
        { workout_type: "Core", exercise_name: "Leg Raises" },
        { workout_type: "Core", exercise_name: "Russian Twists" },
        { workout_type: "Core", exercise_name: "Cable Crunches" }
    ];

    const rows = defaultExercises.map(function(exercise) {
        return {
            user_id: currentUser.id,
            workout_type: exercise.workout_type,
            exercise_name: exercise.exercise_name
        };
    });

    const { error } = await supabaseClient
        .from("exercise_lists")
        .insert(rows);

    if (error) {
        alert(error.message);
        return false;
    }

    return true;
}

function selectManageWorkoutType(workoutType) {
    manageSelectedWorkoutType = workoutType;

    document.getElementById("manageExerciseTypeDisplay").textContent =
        `Selected: ${manageSelectedWorkoutType}`;

    renderExerciseList();
}

async function addCustomExercise() {
    const customExerciseInput = document.getElementById("customExercise");
    const newExercise = customExerciseInput.value.trim();

    if (currentUser === null) {
        alert("Please sign in first");
        return;
    }

    if (newExercise === "") {
        alert("Please enter an exercise name");
        return;
    }

    const exercises = exerciseLists[manageSelectedWorkoutType] || [];

    const alreadyExists = exercises.some(function(exercise) {
        return exercise.toLowerCase() === newExercise.toLowerCase();
    });

    if (alreadyExists) {
        alert("This exercise already exists");
        return;
    }

    const { error } = await supabaseClient
        .from("exercise_lists")
        .insert({
            user_id: currentUser.id,
            workout_type: manageSelectedWorkoutType,
            exercise_name: newExercise
        });

    if (error) {
        alert(error.message);
        return;
    }

    customExerciseInput.value = "";

    await loadExerciseLists();

    if (selectedWorkoutType === manageSelectedWorkoutType) {
        document.getElementById("exercise").value = newExercise;
        renderPreviousWorkouts();
    }
}

function renderExerciseList() {
    const list = document.getElementById("exerciseList");

    list.innerHTML = "";

    const exercises = exerciseLists[manageSelectedWorkoutType] || [];

    if (exercises.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No exercises found.";
        list.appendChild(emptyMessage);
        return;
    }

    exercises.forEach(function(exercise) {
        const item = document.createElement("li");

        const exerciseName = document.createElement("span");
        exerciseName.textContent = exercise;
        item.appendChild(exerciseName);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = function() {
            deleteCustomExercise(exercise);
        };
        item.appendChild(deleteButton);

        list.appendChild(item);
    });
}

async function deleteCustomExercise(exerciseName) {
    const confirmDelete = confirm(`Delete ${exerciseName}?`);

    if (confirmDelete === false) {
        return;
    }

    const { error } = await supabaseClient
        .from("exercise_lists")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("workout_type", manageSelectedWorkoutType)
        .eq("exercise_name", exerciseName);

    if (error) {
        alert(error.message);
        return;
    }

    await loadExerciseLists();

    if (selectedWorkoutType === manageSelectedWorkoutType) {
        renderExerciseDropdown();
        renderPreviousWorkouts();
    }
}

/* =========================
   PREVIOUS WORKOUT DISPLAY
========================= */

function renderPreviousWorkouts() {
    const selectedExercise = document.getElementById("exercise").value;
    const selectedDate = document.getElementById("workoutDate").value;
    const display = document.getElementById("previousWorkout");

    if (selectedExercise === "" || selectedDate === "") {
        display.textContent = "";
        return;
    }

    const previousSets = sets.filter(function(set) {
        return set.exercise === selectedExercise && set.date < selectedDate;
    });

    if (previousSets.length === 0) {
        display.textContent = "No previous record";
        return;
    }

    previousSets.sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    const previousDate = previousSets[0].date;

    const setsFromPreviousDate = previousSets.filter(function(set) {
        return set.date === previousDate;
    });

    const setTexts = setsFromPreviousDate.map(function(set) {
        return formatWeightAndReps(set.weight, set.reps);
    });

    display.textContent =
        `Last ${selectedExercise} on ${formatDate(previousDate)}: ${setTexts.join(", ")}`;
}

/* =========================
   RENDER WORKOUT HISTORY
========================= */

function renderSets() {
    const list = document.getElementById("setList");

    list.innerHTML = "";

    if (sets.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No workouts logged yet.";
        list.appendChild(emptyMessage);
        return;
    }

    const displaySets = [...sets];

    displaySets.sort(function(a, b) {
        if (sortOrder === "newest") {
            return new Date(b.date) - new Date(a.date);
        } else {
            return new Date(a.date) - new Date(b.date);
        }
    });

    const grouped = {};

    displaySets.forEach(function(set) {
        const dateKey = set.date;
        const exerciseKey = `${set.workoutType} - ${set.exercise}`;

        if (grouped[dateKey] === undefined) {
            grouped[dateKey] = {};
        }

        if (grouped[dateKey][exerciseKey] === undefined) {
            grouped[dateKey][exerciseKey] = [];
        }

        grouped[dateKey][exerciseKey].push(set);
    });

    Object.keys(grouped).forEach(function(dateKey) {
        const dateHeading = document.createElement("h3");
        dateHeading.textContent = formatDate(dateKey);
        list.appendChild(dateHeading);

        Object.keys(grouped[dateKey]).forEach(function(exerciseKey) {
            const item = document.createElement("li");

            const label = document.createElement("span");
            label.textContent = `${exerciseKey}: `;
            item.appendChild(label);

            grouped[dateKey][exerciseKey].forEach(function(set) {
                const chip = document.createElement("span");
                chip.className = "set-chip";

                const setText = document.createElement("span");
                setText.textContent = formatWeightAndReps(set.weight, set.reps);
                chip.appendChild(setText);

                const editButton = document.createElement("button");
                editButton.textContent = "✎";
                editButton.title = "Edit";
                editButton.onclick = function() {
                    editSet(set.id);
                };
                chip.appendChild(editButton);

                const deleteButton = document.createElement("button");
                deleteButton.textContent = "×";
                deleteButton.title = "Delete";
                deleteButton.onclick = function() {
                    deleteSet(set.id);
                };
                chip.appendChild(deleteButton);

                item.appendChild(chip);
            });

            list.appendChild(item);
        });
    });
}

/* =========================
   PASSWORD RECOVERY LISTENER
========================= */

supabaseClient.auth.onAuthStateChange(function(event, session) {
    if (event === "PASSWORD_RECOVERY") {
        isPasswordRecovery = true;
        currentUser = session.user;

        document.getElementById("authPage").style.display = "none";
        document.getElementById("appPage").style.display = "none";
        document.getElementById("resetPasswordPage").style.display = "block";
    }
});

/* =========================
   START APP
========================= */

setTimeout(function() {
    checkSession();
}, 500);