let sets = [];

const savedSets = localStorage.getItem("sets");

if (savedSets !== null) {
    sets = JSON.parse(savedSets);
}

sets = sets.map(function(set, index) {
    if (set.id === undefined) {
        set.id = Date.now() + index;
    }

    return set;
});

localStorage.setItem("sets", JSON.stringify(sets));

let selectedWorkoutType = "";
let sortOrder = "newest";
let editingSetId = null;

const upperExercises = ["Pullups", "Bench Press", "Lateral Raises", "Shoulder Press", "Pullovers", "Curls"];
const lowerExercises = ["Squats", "Leg Extension", "Leg Curls", "Calf Raises"];
const coreExercises = ["Plank", "Sit ups", "Leg Raises", "Russian Twists"];

function toggleSortOrder() {
    if (sortOrder === "newest") {
        sortOrder = "oldest";
    } else {
        sortOrder = "newest";
    }

    renderSets();
}

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
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

function selectUpper() {
    selectedWorkoutType = "Upper";
    renderExerciseDropdown();
}

function selectLower() {
    selectedWorkoutType = "Lower";
    renderExerciseDropdown();
}

function selectCore(){
    selectedWorkoutType = "Core";
    renderExerciseDropdown();
}

function addSet() {
    const exercise = document.getElementById("exercise").value;
    const workoutDate = document.getElementById("workoutDate").value;
    const weight = document.getElementById("weight").value;
    const reps = document.getElementById("reps").value;

    if (selectedWorkoutType === "" || exercise === "" || workoutDate === "" || weight === "" || reps === "") {
        alert("Please fill in all fields");
        return;
    }

    if (workoutDate > getTodayDate()) {
        alert("You cannot log a workout for a future date");
        return;
    }

    if (editingSetId === null) {
        sets.push({
            id: Date.now(),
            date: workoutDate,
            workoutType: selectedWorkoutType,
            exercise: exercise,
            weight: weight,
            reps: reps
        });
    } else {
        const setToEdit = sets.find(function(set) {
            return set.id === editingSetId;
        });

        setToEdit.date = workoutDate;
        setToEdit.workoutType = selectedWorkoutType;
        setToEdit.exercise = exercise;
        setToEdit.weight = weight;
        setToEdit.reps = reps;

        editingSetId = null;
        document.getElementById("setButton").textContent = "Add Set";
    }

    localStorage.setItem("sets", JSON.stringify(sets));

    document.getElementById("weight").value = "";
    document.getElementById("reps").value = "";

    renderSets();
    renderPreviousWorkouts();
}

function renderExerciseDropdown() {
    const exerciseDropdown = document.getElementById("exercise");

    exerciseDropdown.innerHTML = "";

    let exercises = [];

    if (selectedWorkoutType === "Upper") {
        exercises = upperExercises;
    } else if (selectedWorkoutType === "Lower") {
        exercises = lowerExercises;
    } else if (selectedWorkoutType === "Core") {
        exercises = coreExercises;
    }

    exercises.forEach(function(exercise) {
        const option = document.createElement("option");
        option.value = exercise;
        option.textContent = exercise;
        exerciseDropdown.appendChild(option);
    });

    renderPreviousWorkouts();
}

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
        return `${set.weight} x ${set.reps}`;
    });

    display.textContent =
        `Last ${selectedExercise} on ${formatDate(previousDate)}: ${setTexts.join(", ")}`;
}

function renderSets() {
    const list = document.getElementById("setList");

    list.innerHTML = "";

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
                setText.textContent = `${set.weight} x ${set.reps}`;
                chip.appendChild(setText);

                const editButton = document.createElement("button");
                editButton.textContent = "Edit";
                editButton.title = "Edit";
                editButton.onclick = function() {
                    editSet(set.id);
                };
                chip.appendChild(editButton);

                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Del";
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

function deleteSet(id) {
    sets = sets.filter(function(set) {
        return set.id !== id;
    });

    localStorage.setItem("sets", JSON.stringify(sets));

    if (editingSetId === id) {
        editingSetId = null;
        document.getElementById("setButton").textContent = "Add Set";
        document.getElementById("weight").value = "";
        document.getElementById("reps").value = "";
    }

    renderSets();
    renderPreviousWorkouts();
}

function editSet(id) {
    const setToEdit = sets.find(function(set) {
        return set.id === id;
    });

    editingSetId = id;

    selectedWorkoutType = setToEdit.workoutType;
    renderExerciseDropdown();

    document.getElementById("exercise").value = setToEdit.exercise;
    document.getElementById("workoutDate").value = setToEdit.date;
    document.getElementById("weight").value = setToEdit.weight;
    document.getElementById("reps").value = setToEdit.reps;

    document.getElementById("setButton").textContent = "Save Edit";

    renderPreviousWorkouts();
}

setDefaultDate();
renderSets();