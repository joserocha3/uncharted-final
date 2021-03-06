'use strict';
/*global chartStore */
/*global recordStore */

// Libs
import {Meteor} from 'meteor/meteor';
import {computed, observable, action} from 'mobx';
import * as _ from 'lodash';

// Globals as locals
import {Countries} from '../api/countries.js';

class Country {

    @observable active = false;
    @observable draw = false;
    @observable populations = [];

    _id = '';
    name = name;
    type = 'country';
    color = '';

    constructor(_id, name, color, populations) {
        this._id = _id;
        this.name = name;
        this.color = '#' + color;
        this.populations = populations;
    }

}

export default class CountryStore {

    @observable countries = [];
    @observable filter = '';

    type = 'country';

    constructor() {

        this.handle = Meteor.subscribe('countries');

        Tracker.autorun(() => {
            if (this.handle.ready()) this.setCountries(Countries.find({delete: {$in: [null, false]}}, {sort: {name: 1}}).fetch());
        });

    }

    @computed get filteredCountries() {
        var matchesFilter = new RegExp(this.filter, 'i');
        return this.countries.filter(country => !this.filter || matchesFilter.test(country.name));
    };

    @computed get activeCountries() {
        return this.countries.filter(country => country.active);
    };

    @computed get countriesToDraw() {
        return this.countries.filter(country => country.draw);
    };

    _randomList(number) {

        if (_.size(this.countries) === 0) return '';

        let list = _.sampleSize(this.countries.peek(), number),
            commaList = '';

        for (let i = 0; i < list.length; i++) {
            commaList += list[i].name;
            if (i < number) commaList += ', ';
        }

        return commaList;

    }

    @action setCountries = values => {
        const countries = values.map(value => new Country(value._id, value.name, value.color, value.populations));
        this.countries.replace(countries);
    }

    @action setActive = value => {
        value.active = !value.active;
        value.draw = value.active;
        recordStore.setYears();
        recordStore.loadRecords();
    }

    @action setDraw = value => {
        value.draw = !value.draw;
    }

    @action toggleAllCountries = () => {
        const active = _.size(this.activeCountries) === 0;
        this.countries.forEach(country => {
            country.active = active;
            country.draw = active;
        });
        recordStore.loadRecords();
        recordStore.setYears();
        chartStore.setTitle();
        chartStore.chartDetermination();
    }

}