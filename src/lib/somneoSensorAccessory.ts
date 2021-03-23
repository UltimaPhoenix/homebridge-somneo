import { CharacteristicValue, Service } from 'homebridge';
import { SomneoPlatform } from '../somneoPlatform';
import { RequestedAccessory } from './requestedAccessory';
import { SomneoAccessory } from './somneoAccessory';
import { SomneoConstants } from './somneoConstants';

export class SomneoSensorAccessory extends SomneoAccessory {

  private static readonly HUMIDITY_SENSOR_NAME = `${SomneoConstants.SOMNEO} Humidity Sensor`;
  private static readonly LUX_SENSOR_NAME = `${SomneoConstants.SOMNEO} Lux Sensor`;
  private static readonly NAME = `${SomneoConstants.SOMNEO} Sensors`;
  private static readonly TEMPERATURE_SENSOR_NAME = `${SomneoConstants.SOMNEO} Temperature Sensor`;

  private humidity: number | undefined;
  private humidityService: Service;
  private luxLevel: number | undefined;
  private luxService: Service;
  private temperatureService: Service;
  private temperature: number | undefined;

  constructor(
    protected platform: SomneoPlatform,
  ) {
    super(platform);

    // set the service names, this is what is displayed as the default name on the Home app
    this.temperatureService = new platform.Service.TemperatureSensor(SomneoSensorAccessory.TEMPERATURE_SENSOR_NAME);
    this.humidityService = new platform.Service.HumiditySensor(SomneoSensorAccessory.HUMIDITY_SENSOR_NAME);
    this.luxService = new platform.Service.LightSensor(SomneoSensorAccessory.LUX_SENSOR_NAME);

    // register handlers for the characteristics
    this.temperatureService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onSet(this.setTemperature.bind(this))
      .onGet(this.getTemperature.bind(this));

    this.humidityService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onSet(this.setRelativeHumidity.bind(this))
      .onGet(this.getRelativeHumidity.bind(this));

    this.luxService.getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
      .onSet(this.setCurrentAmbientLightLevel.bind(this))
      .onGet(this.getCurrentAmbientLightLevel.bind(this));

    this.updateValues();
  }

  protected getName(): string {
    return SomneoSensorAccessory.NAME;
  }

  async updateValues() {

    await this.somneoService.getSensorReadings().then(sensorReadings => {
      this.temperature = sensorReadings.mstmp;
      this.temperatureService
        .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
        .updateValue(this.temperature);

      this.humidity = sensorReadings.msrhu;
      this.humidityService
        .getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
        .updateValue(this.humidity);

      // There is a minimum lux value allowedin Homebridge.
      // Philips uses 0 as the min which will cause errors;
      this.luxLevel = sensorReadings.mslux > SomneoConstants.DEFAULT_LUX_LEVEL ?
        sensorReadings.mslux : SomneoConstants.DEFAULT_LUX_LEVEL;
      this.luxService
        .getCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel)
        .updateValue(this.luxLevel);
    }).catch(err => this.platform.log.error(`Error updating ${this.name}, err=${err}`));
  }

  async setTemperature(value: CharacteristicValue) {

    const numValue = value as number;
    if (numValue === (this.temperature || SomneoConstants.DEFAULT_TEMPERATURE)) {
      return;
    }

    this.temperature = numValue;
    this.platform.log.info(`Set ${this.name} temperature ->`, this.temperature);
  }

  async getTemperature(): Promise<CharacteristicValue> {

    if (this.temperature !== undefined) {
      this.platform.log.debug(`Get ${this.name} temperature ->`, this.temperature);
    }

    return (this.temperature || SomneoConstants.DEFAULT_TEMPERATURE);
  }

  async setRelativeHumidity(value: CharacteristicValue) {

    const numValue = Number(value);
    if (numValue === (this.humidity || SomneoConstants.DEFAULT_HUMIDITY)) {
      return;
    }

    this.humidity = numValue;
    this.platform.log.info(`Set ${this.name} humidity ->`, this.humidity);
  }

  async getRelativeHumidity(): Promise<CharacteristicValue> {

    if (this.humidity !== undefined) {
      this.platform.log.debug(`Get ${this.name} humidity ->`, this.humidity);
    }

    return (this.humidity || SomneoConstants.DEFAULT_HUMIDITY);
  }

  async setCurrentAmbientLightLevel(value: CharacteristicValue) {

    const numValue = Number(value);
    if (numValue === (this.luxLevel || SomneoConstants.DEFAULT_LUX_LEVEL)) {
      return;
    }

    this.luxLevel = numValue;
    this.platform.log.info(`Set ${this.name} lux ->`, this.luxLevel);
  }

  async getCurrentAmbientLightLevel(): Promise<CharacteristicValue> {

    if (this.luxLevel !== undefined) {
      this.platform.log.debug(`Get ${this.name} lux ->`, this.luxLevel);
    }

    return (this.luxLevel || SomneoConstants.DEFAULT_LUX_LEVEL);
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {

    const services: Service[] = [this.informationService];

    if (this.platform.UserSettings.RequestedAccessories.includes(RequestedAccessory.SENSOR_TEMPERATURE)) {
      services.push(this.temperatureService);
    }

    if (this.platform.UserSettings.RequestedAccessories.includes(RequestedAccessory.SENSOR_HUMIDITY)) {
      services.push(this.humidityService);
    }

    if (this.platform.UserSettings.RequestedAccessories.includes(RequestedAccessory.SENSOR_HUMIDITY)) {
      services.push(this.luxService);
    }

    return services;
  }
}
