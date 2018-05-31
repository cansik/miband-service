#!/usr/bin/env node
'use strict';

global.TextDecoder = require('util').TextDecoder;

const bluetooth = require('webbluetooth').bluetooth;
const MiBand = require('./miband/miband');

const log = console.log;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function test_all(miband, log) {

  let info = {
    time:     await miband.getTime(),
    battery:  await miband.getBatteryInfo(),
    hw_ver:   await miband.getHwRevision(),
    sw_ver:   await miband.getSwRevision(),
    serial:   await miband.getSerial(),
  }

  log(`HW ver: ${info.hw_ver}  SW ver: ${info.sw_ver}`);
  info.serial && log(`Serial: ${info.serial}`);
  log(`Battery: ${info.battery.level}%`);
  log(`Time: ${info.time.toLocaleString()}`);

  let ped = await miband.getPedometerStats()
  log('Pedometer:', JSON.stringify(ped))

  log('Notifications demo...')
  await miband.showNotification('message');
  await delay(3000);
  await miband.showNotification('phone');
  await delay(5000);
  await miband.showNotification('off');

  log('Tap MiBand button, quick!')
  miband.on('button', () => log('Tap detected'))
  try {
    await miband.waitButton(10000)
  } catch (e) {
    log('OK, nevermind ;)')
  }

  log('Heart Rate Monitor (single-shot)')
  log('Result:', await miband.hrmRead())

  log('Heart Rate Monitor (continuous for 30 sec)...')
  miband.on('heart_rate', (rate) => {
    log('Heart Rate:', rate)
  })
  await miband.hrmStart();
  await delay(30000);
  await miband.hrmStop();

  //log('RAW data (no decoding)...')
  //miband.rawStart();
  //await delay(30000);
  //miband.rawStop();

  log('Finished.')
}

async function scan() {
  try {
    log('Requesting Bluetooth Device...');
    const device = await bluetooth.requestDevice({
      filters: [
        { services: [ MiBand.advertisementService ] }
      ],
      optionalServices: MiBand.optionalServices
    });

    device.addEventListener('gattserverdisconnected', () => {
      log('Device disconnected');
    });

    log('Connecting to the device...');
    const server = await device.gatt.connect();
    log('Connected');

    let miband = new MiBand(server);

    await miband.init();

    await test_all(miband, log);

  } catch(error) {
    log('Argh!', error);
  }
}

scan();