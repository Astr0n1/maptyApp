'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

///////////////////////////////////////////////////////////////////////////////////////
class Workout {
  constructor(distance, duration, coords) {
    this.id = +(Date.now() + '').slice(-6);
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
    this.date = new Date();
  }

  _popupContent() {
    return `${this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${this.type} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.pace = this.duration / this.distance;
    this.popupContent = this._popupContent();
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(distance, duration, coords, elevation) {
    super(distance, duration, coords);
    this.elevation = elevation;
    this.speed = this.distance / (this.duration / 60);
    this.popupContent = this._popupContent();
  }
}

class App {
  #map;
  #zoomLevel = 13;
  #markerPosition;
  #tantaCoords = [30.790216480462256, 31.00273132324219];
  #workouts = [];

  constructor() {
    this._restoreLocalStorage();
    this._getPosition();

    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    form.addEventListener('submit', e => {
      e.preventDefault();
      this._newWorkout.call(this);
    });

    form.addEventListener('keyup', e => {
      if (e.key === 'Escape') this._resetForm();
    });

    containerWorkouts.addEventListener('click', this._goToWorkout.bind(this));
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      mapEvent => this._loadMap.call(this, mapEvent.coords),
      () => alert(`Couldn't access your location`)
    );
  }

  _loadMap({ latitude, longitude }) {
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(this.#tantaCoords, this.#zoomLevel); //coords

    // Load tile layer
    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // render markers from local storage
    this.#workouts.forEach(work => this._renderOnMap(work));

    L.marker(this.#tantaCoords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 100,
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: 'leaflet-popup',
        })
      )
      .setPopupContent('Current Location')
      .openPopup();

    // Add new workout
    this.#map.on('click', mapEvent => {
      const { lat, lng } = mapEvent.latlng;
      this.#markerPosition = [lat, lng];
      this._showForm.call(this);
    });
  }

  _showForm() {
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _resetForm() {
    form.style.display = 'none';
    form.classList.add('hidden');
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _newWorkout() {
    // recieve and check data integrity
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    if (inputType.value === 'running') {
      const cadence = +inputCadence.value;

      if (!this._checkNumbers(distance, duration, cadence)) {
        this._resetForm();
        return alert('Input fields must contain positive Numbers !!');
      }

      workout = new Running(distance, duration, this.#markerPosition, cadence);
    }

    if (inputType.value === 'cycling') {
      const elevation = +inputElevation.value;

      if (!this._checkNumbers(distance, duration, elevation)) {
        this._resetForm();
        return alert('Input fields must contain positive Numbers !!');
      }

      workout = new Cycling(
        distance,
        duration,
        this.#markerPosition,
        elevation
      );
    }

    // push the workout
    this.#workouts.push(workout);

    this._setLocalStorage();

    this._resetForm();

    this._renderOnMap(workout);

    this._renderInList(workout);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _checkNumbers = (...numpers) => {
    return numpers.every(num => Number.isFinite(num) && num > 0);
  };

  _renderOnMap(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 300,
          minWidth: 100,
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: `${
            workout.type === 'running' ? 'running' : 'cycling'
          }-popup`,
        })
      )
      .setPopupContent(workout.popupContent)
      .openPopup();
  }

  _renderInList(workout) {
    let HTML = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.popupContent}</h2>
          <div class="workout__details">
            <span class="workout__icon">
            ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
            </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">
            ${
              workout.type === 'running'
                ? `${workout.pace.toFixed(1)}`
                : `${workout.speed.toFixed(1)}`
            }
            </span>
            <span class="workout__unit">
            ${workout.type === 'running' ? 'min/km' : 'km/h'}
            </span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">
            ${workout.type === 'running' ? '🦶🏼' : '⛰'}
            </span>
            <span class="workout__value">
            ${
              workout.type === 'running'
                ? `${workout.cadence}`
                : `${workout.elevation}`
            }
            </span>
            <span class="workout__unit">
            ${workout.type === 'running' ? 'spm' : 'm'}
            </span>
          </div>
        </li>
    `;

    form.insertAdjacentHTML('afterend', HTML);
  }

  _goToWorkout(e) {
    const targetHTML = e.target.closest('.workout');
    if (targetHTML) {
      const targetWorkout = this.#workouts.find(
        workout => workout.id === +targetHTML.dataset.id
      );
      this.#map.setView(targetWorkout.coords, this.#zoomLevel, {
        animate: true,
        duration: 1,
        easeLinearity: 0.4,
      });
    }
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _restoreLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (data) {
      this.#workouts = data;
    }

    this.#workouts.forEach(work => this._renderInList(work));
  }
}

const app = new App();
