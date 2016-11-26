import {computed, observable} from 'mobx';
import * as _ from 'lodash';

import {Records} from '../api/records.js';
import {Countries} from '../api/countries.js';
import {Indicators} from '../api/indicators.js';

export default class RecordStore {

    @observable records = [];
    @observable years = [0,9999];
    @observable yearsToDraw = [0,9999];

    constructor() {

        this.handle = Meteor.subscribe('records');

        Tracker.autorun(() => {
            if (this.handle.ready()) this.setRecords(Records.find().fetch());
        });

    }

    setRecords = values => {
        const records = [];
        values.forEach(record => {
            record.values.forEach(value => {
                if (!value.delete) {
                    records.push(new Record(
                        record,
                        value,
                        Countries.findOne({_id: record.country}).name,
                        Countries.findOne({_id: record.country}).color,
                        Indicators.findOne({_id: record.indicator}).name,
                        Indicators.findOne({_id: record.indicator}).code
                    ));
                }
            });
        });
        this.records.replace(records);
    }

    setYears = () => {

        const activeCountries = countryStore.activeCountries,
            activeIndicators = indicatorStore.activeIndicators;

        const records = _.filter(this.records, record => {
            return (
                _.find(activeCountries, {_id: record.countryId}) &&
                _.find(activeIndicators, {_id: record.indicatorId})
            );
        });

        const years = _.sortBy(_.keys(_.groupBy(records, 'year')), 'year');

        if (years.length === 0) {
            this.years.replace([0, 9999]);
            this.yearsToDraw.replace([0, 9999]);
            return;
        }

        const first = years[0],
            last = years[years.length - 1];

        this.years.replace([parseInt(first), parseInt(last)]);

        if (this.yearsToDraw[0] === 0)
            this.yearsToDraw.replace([parseInt(first), parseInt(last)]);

        if (this.yearsToDraw[0] < first)
            this.yearsToDraw.replace([parseInt(first), this.yearsToDraw[1]]);

        if (this.yearsToDraw[1] > last)
            this.yearsToDraw.replace([this.yearsToDraw[0], parseInt(last)]);

    }

    @computed get firstYear() {
        return this.years[0];
    }

    @computed get lastYear() {
        return this.years[1];
    }

    @computed get recordsToDraw() {

        // Get records for active countries/indicators

        const activeCountries = countryStore.activeCountries,
            activeIndicators = indicatorStore.activeIndicators;

        const records = _.filter(this.records, record => {
            return (
                record.year >= this.yearsToDraw[0] && record.year <= this.yearsToDraw[1] &&
                _.find(activeCountries, {_id: record.countryId}) &&
                _.find(activeIndicators, {_id: record.indicatorId})
            );
        });

        const sortedRecords = _.sortBy(records, ['year', 'countryName', 'indicatorName']);

        // Set color based on number of indicators

        const usedIndicatorIds = _.keys(_.groupBy(sortedRecords, 'indicatorId'));

        sortedRecords.forEach(record => {
            const index = _.findIndex(usedIndicatorIds, id => id === record.indicatorId)
            const color = this._shadeColor2(record.originalColor, index / usedIndicatorIds.length);
            record.countryColor = color;
        });

        // Remove the records we are not drawing, we initially pull all active indicators so we can
        // be consistent with the colors when the user removes one via the legend

        const filteredRecords = _.filter(sortedRecords, record => {
            return (
                _.find(countryStore.countriesToDraw, {'_id': record.countryId}) &&
                _.find(indicatorStore.indicatorsToDraw, {'_id': record.indicatorId})
            );
        });

        return filteredRecords;
    }

    _shadeColor2(color, percent) {

        var f = parseInt(color.slice(1), 16),
            t = percent < 0 ? 0 : 255,
            p = percent < 0 ? percent * -1 : percent,
            R = f >> 16,
            G = f >> 8 & 0x00FF,
            B = f & 0x0000FF;

        return "#" +
            (0x1000000 +
            (Math.round((t - R) * p) + R) * 0x10000 +
            (Math.round((t - G) * p) + G) * 0x100 +
            (Math.round((t - B) * p) + B))
                .toString(16).slice(1);

    }

}

class Record {

    _id = '';
    countryId = '';
    countryName = '';
    indicatorId = '';
    indicatorName = '';
    indicatorCode = '';
    year = 0;
    value = 0;
    originalColor = '';

    constructor(record, value, countryName, countryColor, indicatorName, indicatorCode) {
        this._id = record._id;
        this.countryId = record.country
        this.countryName = countryName
        this.countryColor = '#' + countryColor
        this.indicatorId = record.indicator;
        this.indicatorName = indicatorName;
        this.indicatorCode = indicatorCode;
        this.year = Number.parseInt(value.year)
        this.value = Number.parseFloat(value.value)
        this.originalColor = '#' + countryColor
    }

}