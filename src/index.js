import React, {Component, PropTypes} from 'react';
import classNames from 'classnames';
import moment from 'moment';
import debounce from 'lodash/debounce';
import range from 'lodash/range';
import {getScrollSpeed, getMonthsForYear, keyCodes, parseDate, parseDates, validDate, validDisplay, validLayout} from './utils';
import defaultLocale from './locale';
import defaultTheme from './theme';
import Today from './Today';
import Header from './Header';
import List from './List';
import Weekdays from './Weekdays';
import Years from './Years';

const containerStyle = require('./Container.scss');
const dayStyle = require('./Day/Day.scss');
const style = {
	container: containerStyle,
	day: dayStyle
};

export default class InfiniteCalendar extends Component {
	constructor(props) {
		super();

		// Initialize
		this.updateLocale(props.locale);
		this.updateYears(props);
		this.state = {
			selectedDates: this.parseSelectedDates(props.selectedDates),
			display: props.display,
			shouldHeaderAnimate: props.shouldHeaderAnimate,
			showHeader: props.showHeader && !props.multiDate
		};
	}
	static defaultProps = {
		width: 400,
		height: 500,
		rowHeight: 56,
		overscanMonthCount: 4,
		todayHelperRowOffset: 4,
		layout: 'portrait',
		display: 'days',
		multiDate: false,
		selectedDates: [new Date()],
		fixedSelectedDates: [],
		min: {year: 1980, month: 0, day: 0},
		minDate: {year: 1980, month: 0, day: 0},
		max: {year: 2050, month: 11, day: 31},
		maxDate: {year: 2050, month: 11, day: 31},
		keyboardSupport: true,
		autoFocus: true,
		shouldHeaderAnimate: true,
		showOverlay: true,
		showTodayHelper: true,
		showHeader: true,
		tabIndex: 1,
		locale: {},
		theme: {},
		hideYearsOnSelect: true
	};
	static propTypes = {
		selectedDates: PropTypes.arrayOf(validDate),
		fixedSelectedDates: PropTypes.arrayOf(validDate),
		multiDate: PropTypes.bool,
		min: validDate,
		max: validDate,
		minDate: validDate,
		maxDate: validDate,
		initScrollDate: validDate,
		locale: PropTypes.object,
		theme: PropTypes.object,
		width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
		height: PropTypes.number,
		rowHeight: PropTypes.number,
		className: PropTypes.string,
		overscanMonthCount: PropTypes.number,
		todayHelperRowOffset: PropTypes.number,
		disabledDays: PropTypes.arrayOf(PropTypes.number),
		disabledDates: PropTypes.arrayOf(validDate),
		beforeSelect: PropTypes.func,
		onSelect: PropTypes.func,
		afterSelect: PropTypes.func,
		onScroll: PropTypes.func,
		onScrollEnd: PropTypes.func,
		keyboardSupport: PropTypes.bool,
		autoFocus: PropTypes.bool,
		onKeyDown: PropTypes.func,
		tabIndex: PropTypes.number,
		layout: validLayout,
		display: validDisplay,
		hideYearsOnSelect: PropTypes.bool,
		shouldHeaderAnimate: PropTypes.bool,
		showOverlay: PropTypes.bool,
		showTodayHelper: PropTypes.bool,
		showHeader: PropTypes.bool
	};
	componentDidMount() {
		let {autoFocus, keyboardSupport} = this.props;
		this.node = this.refs.node;
		this.list = this.refs.List;

		if (keyboardSupport && autoFocus) {
			this.node.focus();
		}
	}
	componentWillReceiveProps(next) {
		let {min, minDate, max, maxDate, locale, selectedDates} = this.props;
		let {display} = this.state;

		if (next.locale !== locale) {
			this.updateLocale(next.locale);
		}
		if (next.min !== min || next.minDate !== minDate || next.max !== max || next.maxDate !== maxDate) {
			this.updateYears(next);
		}
		if (next.selectedDates !== selectedDates) {
			var parsed = this.parseSelectedDates(next.selectedDates)
			this.setState({
				selectedDates: parsed
			});
			//if(parsed) this.scrollToDate(parsed,-this.props.rowHeight*2);
		} else if (next.minDate !== minDate || next.maxDate !== maxDate) {
			let _selectedDates = this.parseSelectedDates(this.state.selectedDates);
			if (!_selectedDates == this.state.selectedDates) {
				this.setState({
					selectedDates: _selectedDates
				});
			}
		}
		if (next.display !== display) {
			this.setState({
				display: next.display
			});
		}
	}
	parseSelectedDate(selectedDate) {
		if (selectedDate) {
			selectedDate = moment(selectedDate);

			// Selected Date should not be before min date or after max date
			if (selectedDate.isBefore(this._minDate)) {
				return this._minDate;
			} else if (selectedDate.isAfter(this._maxDate)) {
				return this._maxDate;
			}
		}

		return selectedDate;
	}
	parseSelectedDates(selectedDates) {
		var _selectedDates = []
		for (var selectedDate of selectedDates) { // assume we are not given duplicates
		  _selectedDates.push(this.parseSelectedDate(selectedDate));
		}

		return _selectedDates;
	}
	updateYears(props = this.props) {
		let min = this._min = moment(props.min);
		let max = this._max = moment(props.max);
		this._minDate = moment(props.minDate);
		this._maxDate = moment(props.maxDate);

		this.years = range(min.year(), max.year() + 1).map((year) => getMonthsForYear(year, min, max));
		this.months = [].concat.apply([], this.years);
	}
	updateLocale(locale) {
		locale = this.getLocale(locale);
		moment.updateLocale(locale.name, locale);
		moment.locale(locale.name);
	}
	getDisabledDates(disabledDates) {
		return disabledDates && disabledDates.map((date) => moment(date).format('YYYYMMDD'));
	}
	getLocale(customLocale = this.props.locale) {
		return Object.assign({}, defaultLocale, customLocale);
	}
	getTheme(customTheme = this.props.theme) {
		return Object.assign({}, defaultTheme, customTheme);
	}
	onDaySelect = (selectedDate, e, shouldHeaderAnimate = this.props.shouldHeaderAnimate) => {
		let {afterSelect, beforeSelect, onSelect} = this.props;
		let selectedDates = this.state.selectedDates || [];
		const dateIndex = this.getSelectedDateIndex(selectedDate);
		const isSelected = (dateIndex === -1);

		if (!beforeSelect || typeof beforeSelect == 'function' && beforeSelect(selectedDate, isSelected, selectedDates)) {
			if (typeof onSelect == 'function') {
				onSelect(selectedDate, isSelected, selectedDates, e);
			}

			if (isSelected) {
				selectedDates.push(selectedDate);
			}
			else {
				selectedDates.splice(dateIndex, 1);
			}

			selectedDates = this.parseSelectedDates(selectedDates);
			this.setState({
				selectedDates: selectedDates,
				shouldHeaderAnimate,
				highlightedDate: selectedDate.clone()
			}, () => {
				this.clearHighlight();
				if (typeof afterSelect == 'function') {
					afterSelect(selectedDate, isSelected, selectedDates);
				}
			});
		}
	};
	getSelectedDateIndex = (date) => {
		var {selectedDates} = this.state;
		let i = 0;
		for (let selectedDate of selectedDates) {
			if (selectedDate.format('YYYYMMDD') === date.format('YYYYMMDD')) {
				return i;
			}
			i++;
		}
		return -1;
	};
	getCurrentOffset = () => {
		return this.scrollTop;
	};
	getDateOffset = (date) => {
		return this.list && this.list.getDateOffset(date);
	};
	scrollTo = (offset) => {
		return this.list && this.list.scrollTo(offset);
	};
	scrollToDate = (date = moment(), offset) => {
		return this.list && this.list.scrollToDate(date, offset);
	};
	getScrollSpeed = getScrollSpeed();
	onScroll = ({scrollTop}) => {
		let {onScroll, showOverlay, showTodayHelper} = this.props;
		let {isScrolling} = this.state;
		let scrollSpeed = this.scrollSpeed = Math.abs(this.getScrollSpeed(scrollTop));
		this.scrollTop = scrollTop;

		// We only want to display the months overlay if the user is rapidly scrolling
		if (showOverlay && scrollSpeed >= 50 && !isScrolling) {
			this.setState({
				isScrolling: true
			});
		}

		if (showTodayHelper) {
			this.updateTodayHelperPosition(scrollSpeed);
		}
		if (typeof onScroll == 'function') {
			onScroll(scrollTop);
		}
		this.onScrollEnd();
	};
	onScrollEnd = debounce(() => {
		let {onScrollEnd, showTodayHelper} = this.props;
		let {isScrolling} = this.state;

		if (isScrolling) this.setState({isScrolling: false});
		if (showTodayHelper) this.updateTodayHelperPosition(0);
		if (typeof onScrollEnd == 'function') onScrollEnd(this.scrollTop);
	}, 150);
	updateTodayHelperPosition = (scrollSpeed) => {
		let date = this.today.date;
		if (!this.todayOffset) this.todayOffset = this.getDateOffset(date); //scrollTop offset of the month "today" is in

		let scrollTop = this.scrollTop;
		let {showToday} = this.state;
		let {height, rowHeight, todayHelperRowOffset} = this.props;
		let newState;
		let dayOffset = Math.ceil((date.date()-7+moment(date).startOf("month").day())/7)*rowHeight; //offset of "today" within its month

		if (scrollTop >= this.todayOffset + dayOffset + rowHeight * (todayHelperRowOffset+1)) {
			if (showToday !== 1) newState = 1; //today is above the fold
		} else if (scrollTop + height <= this.todayOffset + dayOffset + rowHeight - rowHeight * (todayHelperRowOffset+1)) {
			if (showToday !== -1) newState = -1; //today is below the fold
		} else if (showToday && scrollSpeed <= 1) {
			newState = false;
		}

		if (scrollTop == 0) {
			newState = false;
		}

		if (newState != null) {
			this.setState({showToday: newState});
		}
	};
	handleKeyDown = (e) => {
		let {maxDate, minDate, onKeyDown} = this.props;
		let {display, selectedDates, highlightedDate, showToday} = this.state;
		let delta = 0;

		if (typeof onKeyDown == 'function') {
			onKeyDown(e);
		}
		if ([keyCodes.left, keyCodes.up, keyCodes.right, keyCodes.down].indexOf(e.keyCode) > -1 && typeof e.preventDefault == 'function') {
			e.preventDefault();
		}

		if (!selectedDates) {
			selectedDates.push(moment());
		}

		if (display == 'days') {
			if (!highlightedDate) {
				highlightedDate = selectedDates[0].clone();
				this.setState({highlightedDate});
			}

			switch (e.keyCode) {
				case keyCodes.enter:
					this.onDaySelect(moment(highlightedDate), e);
					return;
				case keyCodes.left:
					delta = -1;
					break;
				case keyCodes.right:
					delta = +1;
					break;
				case keyCodes.down:
					delta = +7;
					break;
				case keyCodes.up:
					delta = -7;
					break;
			}

			if (delta) {
				let {rowHeight} = this.props;
				let newHighlightedDate = moment(highlightedDate).add(delta, 'days');

				// Make sure the new highlighted date isn't before min / max
				if (newHighlightedDate.isBefore(minDate)) {
					newHighlightedDate = moment(minDate);
				} else if (newHighlightedDate.isAfter(maxDate)) {
					newHighlightedDate = moment(maxDate);
				}

				// Update the highlight indicator
				this.clearHighlight();

				// Scroll the view
				if (!this.currentOffset) this.currentOffset = this.getCurrentOffset();
				let currentOffset = this.currentOffset;
				let monthOffset = this.getDateOffset(newHighlightedDate);
				let navOffset = (showToday) ? 36 : 0;

				let highlightedEl = this.highlightedEl = this.node.querySelector(`[data-date='${newHighlightedDate.format('YYYYMMDD')}']`);

				// Edge-case: if the user tries to use the keyboard when the new highlighted date isn't rendered because it's too far off-screen
				// We need to scroll to the month of the new highlighted date so it renders
				if (!highlightedEl) {
					this.scrollTo(monthOffset - navOffset);
					return;
				}

				highlightedEl.classList.add(style.day.highlighted);

				let dateOffset = highlightedEl.offsetTop - rowHeight;
				let newOffset = monthOffset + dateOffset;


				if (currentOffset !== newOffset) {
					this.currentOffset = newOffset;
					this.scrollTo(newOffset - navOffset);
				}

				// Update the reference to the currently highlighted date
				this.setState({
					highlightedDate: newHighlightedDate
				});

			}
		} else if (display == 'years' && this.refs.years) {
			this.refs.years.handleKeyDown(e);
		}
	};
	clearHighlight() {
		if (this.highlightedEl) {
			this.highlightedEl.classList.remove(style.day.highlighted);
			this.highlightedEl = null;
		}
	}
	setDisplay = (display) => {
		this.setState({display});
	}
	render() {
		let {
			className,
			disabledDays,
			height,
			hideYearsOnSelect,
			keyboardSupport,
			layout,
			overscanMonthCount,
			min,
			minDate,
			initScrollDate,
			max,
			maxDate,
			showTodayHelper,
			showHeader,
			tabIndex,
			width,
			...other
		} = this.props;
		let disabledDates = this.getDisabledDates(this.props.disabledDates);
		let locale = this.getLocale();
		let theme = this.getTheme();
		let {display, isScrolling, selectedDates, showToday, shouldHeaderAnimate} = this.state;
		let today = this.today = parseDate(moment());
		let fixedSelectedDates = parseDates(this.props.fixedSelectedDates);

		return (
			<div tabIndex={tabIndex} onKeyDown={keyboardSupport && this.handleKeyDown} className={classNames(className, style.container.root, {[style.container.landscape]: layout == 'landscape'})} style={{color: theme.textColor.default, width, fontSize: theme.calendarContainer.fontSize, fontFamily: theme.calendarContainer.fontFamily}} aria-label="Calendar" ref="node">
				{showHeader &&
					<Header selectedDate={selectedDates && selectedDates.length && selectedDates[0]} shouldHeaderAnimate={shouldHeaderAnimate} layout={layout} theme={theme} locale={locale} scrollToDate={this.scrollToDate} setDisplay={this.setDisplay} display={display} />
				}
				<div className={style.container.wrapper}>
					<Weekdays theme={theme} />
					<div className={style.container.listWrapper}>
						{showTodayHelper &&
							<Today scrollToDate={this.scrollToDate} show={showToday} today={today} theme={theme} locale={locale} />
						}
						<List
							ref="List"
							{...other}
							width={width}
							height={height}
							selectedDates={selectedDates}
							fixedSelectedDates={fixedSelectedDates}
							disabledDates={disabledDates}
							disabledDays={disabledDays}
							months={this.months}
							onDaySelect={this.onDaySelect}
							onScroll={this.onScroll}
							isScrolling={isScrolling}
							today={today}
							min={parseDate(min)}
							minDate={parseDate(minDate)}
							maxDate={parseDate(maxDate)}
							initScrollDate={parseDate(initScrollDate)}
							theme={theme}
							locale={locale}
							overscanMonthCount={overscanMonthCount}
						/>
					</div>
					{display == 'years' &&
						<Years
							ref="years"
							width={width}
							height={height}
							onDaySelect={this.onDaySelect}
							minDate={minDate}
							maxDate={maxDate}
							selectedDates={selectedDates}
							theme={theme}
							years={range(moment(min).year(), moment(max).year() + 1)}
							setDisplay={this.setDisplay}
							scrollToDate={this.scrollToDate}
							hideYearsOnSelect={hideYearsOnSelect}
						/>
					}
				</div>
			</div>
		);
	}
}
