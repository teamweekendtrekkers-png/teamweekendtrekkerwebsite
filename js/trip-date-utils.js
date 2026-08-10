(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    root.TripDateUtils = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const MONTHS = {
        jan: 0,
        january: 0,
        feb: 1,
        february: 1,
        mar: 2,
        march: 2,
        apr: 3,
        april: 3,
        may: 4,
        jun: 5,
        june: 5,
        jul: 6,
        july: 6,
        aug: 7,
        august: 7,
        sep: 8,
        sept: 8,
        september: 8,
        oct: 9,
        october: 9,
        nov: 10,
        november: 10,
        dec: 11,
        december: 11
    };

    const MONTH_LABELS = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    function getMonthIndex(value) {
        if (!value) return null;
        const month = MONTHS[String(value).toLowerCase()];
        return Number.isInteger(month) ? month : null;
    }

    function createDate(year, month, day) {
        const date = new Date(Date.UTC(year, month, day));
        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month ||
            date.getUTCDate() !== day
        ) {
            return null;
        }
        return date;
    }

    function toDateKey(date) {
        return [
            date.getUTCFullYear(),
            String(date.getUTCMonth() + 1).padStart(2, '0'),
            String(date.getUTCDate()).padStart(2, '0')
        ].join('-');
    }

    function formatDateRange(start, end, uppercase) {
        const startMonth = MONTH_LABELS[start.getUTCMonth()];
        const endMonth = MONTH_LABELS[end.getUTCMonth()];
        const startMonthLabel = uppercase ? startMonth.toUpperCase() : startMonth;
        const endMonthLabel = uppercase ? endMonth.toUpperCase() : endMonth;
        const startDay = start.getUTCDate();
        const endDay = end.getUTCDate();
        const startYear = start.getUTCFullYear();
        const endYear = end.getUTCFullYear();

        if (startYear === endYear && start.getUTCMonth() === end.getUTCMonth()) {
            if (startDay === endDay) {
                return uppercase
                    ? `${startMonthLabel} ${startDay}, ${startYear}`
                    : `${startMonthLabel} ${startDay}`;
            }
            return uppercase
                ? `${startMonthLabel} ${startDay}–${endDay}, ${startYear}`
                : `${startMonthLabel} ${startDay}–${endDay}`;
        }

        if (startYear === endYear) {
            return uppercase
                ? `${startMonthLabel} ${startDay}–${endMonthLabel} ${endDay}, ${startYear}`
                : `${startMonthLabel} ${startDay}–${endMonthLabel} ${endDay}`;
        }

        return uppercase
            ? `${startMonthLabel} ${startDay}, ${startYear}–${endMonthLabel} ${endDay}, ${endYear}`
            : `${startMonthLabel} ${startDay}–${endMonthLabel} ${endDay}`;
    }

    function normalizeDateLabel(value) {
        return String(value || '')
            .trim()
            .replace(/[–—]/g, '-')
            .replace(/\.(?=\s*\d{4}(?:-\d{2,4})?\s*$)/, ', ')
            .replace(/\s+/g, ' ');
    }

    function parseTripDateRange(value) {
        const label = normalizeDateLabel(value);
        if (!label) return null;

        let startMonth;
        let endMonth;
        let startDay;
        let endDay;
        let startYear;
        let endYear;
        let match;

        match = label.match(/^([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:-(\d{2,4}))?$/);
        if (match) {
            startMonth = getMonthIndex(match[1]);
            endMonth = getMonthIndex(match[3]);
            startDay = Number(match[2]);
            endDay = Number(match[4]);
            startYear = Number(match[5]);

            if (match[6]) {
                const suppliedEndYear = Number(match[6]);
                endYear = match[6].length === 2
                    ? Math.floor(startYear / 100) * 100 + suppliedEndYear
                    : suppliedEndYear;
            } else {
                endYear = endMonth < startMonth ? startYear + 1 : startYear;
            }
        } else {
            match = label.match(/^([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})$/);
            if (match) {
                startMonth = getMonthIndex(match[1]);
                endMonth = startMonth;
                startDay = Number(match[2]);
                endDay = Number(match[3]);
                startYear = Number(match[4]);
                endYear = startYear;
            } else {
                match = label.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
                if (!match) return null;

                startMonth = getMonthIndex(match[1]);
                endMonth = startMonth;
                startDay = Number(match[2]);
                endDay = startDay;
                startYear = Number(match[3]);
                endYear = startYear;
            }
        }

        if (startMonth === null || endMonth === null) return null;

        const start = createDate(startYear, startMonth, startDay);
        const end = createDate(endYear, endMonth, endDay);
        if (!start || !end || end.getTime() < start.getTime()) return null;

        const weekday = new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            timeZone: 'UTC'
        }).format(start);

        return {
            originalLabel: value,
            start,
            end,
            startKey: toDateKey(start),
            endKey: toDateKey(end),
            key: `${toDateKey(start)}/${toDateKey(end)}`,
            shortLabel: formatDateRange(start, end, false),
            fullLabel: formatDateRange(start, end, true),
            weekdayLabel: `${weekday} Departures`
        };
    }

    function getIndiaTodayTimestamp(referenceDate) {
        const reference = referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())
            ? referenceDate
            : new Date();
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }).formatToParts(reference);
        const values = {};

        parts.forEach(part => {
            if (part.type !== 'literal') values[part.type] = Number(part.value);
        });

        return Date.UTC(values.year, values.month - 1, values.day);
    }

    function getUpcomingDateRanges(trip, referenceDate) {
        if (!trip || trip.isActive === false || !Array.isArray(trip.availableDates)) {
            return [];
        }

        const today = getIndiaTodayTimestamp(referenceDate);
        const seen = new Set();

        return trip.availableDates
            .map(parseTripDateRange)
            .filter(dateRange => {
                if (!dateRange || dateRange.end.getTime() < today || seen.has(dateRange.key)) {
                    return false;
                }
                seen.add(dateRange.key);
                return true;
            })
            .sort((left, right) => left.start.getTime() - right.start.getTime());
    }

    function getTripDateTags(trip, referenceDate, limit) {
        const tagLimit = Number.isInteger(limit) && limit > 0 ? limit : 3;
        const dates = getUpcomingDateRanges(trip, referenceDate);

        return {
            visible: dates.slice(0, tagLimit),
            remaining: Math.max(0, dates.length - tagLimit)
        };
    }

    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[character]));
    }

    function renderTripDateTags(trip, referenceDate, limit) {
        const tags = getTripDateTags(trip, referenceDate, limit);

        if (tags.visible.length === 0) {
            return `
                <div class="trip-dates trip-dates-empty" aria-label="Available trip dates">
                    <span class="trip-dates-label"><i class="far fa-calendar-alt" aria-hidden="true"></i> New dates coming soon</span>
                </div>`;
        }

        const dateTags = tags.visible.map(date => `
            <span class="trip-date-tag" title="${escapeHTML(date.fullLabel)}">
                <time datetime="${date.startKey}">${escapeHTML(date.shortLabel)}</time>
            </span>`).join('');
        const remaining = tags.remaining > 0
            ? `<span class="trip-date-more" aria-label="${tags.remaining} more dates">+${tags.remaining} more</span>`
            : '';

        return `
            <div class="trip-dates" aria-label="Available trip dates">
                <span class="trip-dates-label"><i class="far fa-calendar-alt" aria-hidden="true"></i> Available dates</span>
                <div class="trip-date-tags">${dateTags}${remaining}</div>
            </div>`;
    }

    function buildUpcomingBatches(trips, referenceDate, limit) {
        const batchLimit = Number.isInteger(limit) && limit > 0 ? limit : 3;
        const batches = new Map();

        (Array.isArray(trips) ? trips : []).forEach(trip => {
            if (!trip || trip.isActive === false) return;

            getUpcomingDateRanges(trip, referenceDate).forEach(dateRange => {
                if (!batches.has(dateRange.key)) {
                    batches.set(dateRange.key, {
                        key: dateRange.key,
                        start: dateRange.start,
                        end: dateRange.end,
                        datetime: dateRange.startKey,
                        dateLabel: dateRange.fullLabel,
                        weekdayLabel: dateRange.weekdayLabel,
                        trips: []
                    });
                }

                const batch = batches.get(dateRange.key);
                const tripKey = trip.id || trip.title;
                if (!batch.trips.some(batchTrip => (batchTrip.id || batchTrip.title) === tripKey)) {
                    batch.trips.push({
                        id: trip.id,
                        title: trip.title,
                        price: trip.price,
                        location: trip.location
                    });
                }
            });
        });

        return Array.from(batches.values())
            .sort((left, right) => left.start.getTime() - right.start.getTime())
            .slice(0, batchLimit);
    }

    return {
        parseTripDateRange,
        getUpcomingDateRanges,
        getTripDateTags,
        buildUpcomingBatches,
        renderTripDateTags,
        escapeHTML
    };
}));
