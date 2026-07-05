import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';
import AppText from './AppText';
import designSystem from '../../theme/designSystem';

/**
 * DateTimePicker - Composant cross-platform pour saisie de date et heure
 *
 * Web: Utilise les inputs HTML5 natifs (date/time pickers du navigateur)
 * Mobile: TextInput avec formatage automatique et validation
 */
const DateTimePicker = ({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateLabel = "Date",
  timeLabel = "Heure",
  containerStyle
}) => {

  // Convertir DD/MM/YYYY → YYYY-MM-DD pour input HTML5
  const convertToHtml5Date = (ddmmyyyy) => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return '';
    const [day, month, year] = ddmmyyyy.split('/');
    return `${year}-${month}-${day}`;
  };

  // Convertir YYYY-MM-DD → DD/MM/YYYY
  const convertFromHtml5Date = (yyyymmdd) => {
    if (!yyyymmdd) return '';
    const [year, month, day] = yyyymmdd.split('-');
    return `${day}/${month}/${year}`;
  };

  /**
   * Formate l'entrée de date avec des /
   * Ex: 13102025 → 13/10/2025
   */
  const formatDateInput = (text) => {
    const numbers = text.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);

    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  /**
   * Formate l'entrée d'heure avec :
   * Ex: 0830 → 08:30
   */
  const formatTimeInput = (text) => {
    const numbers = text.replace(/\D/g, '');
    const limited = numbers.slice(0, 4);

    if (limited.length <= 2) {
      return limited;
    } else {
      return `${limited.slice(0, 2)}:${limited.slice(2)}`;
    }
  };

  /**
   * Valide la date entrée
   */
  const validateDate = (dateStr) => {
    if (!dateStr || dateStr.length < 10) {
      return { valid: true, message: '' };
    }

    const parts = dateStr.split('/');
    if (parts.length !== 3) {
      return { valid: false, message: 'Format invalide (JJ/MM/AAAA)' };
    }

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return { valid: false, message: 'Date invalide' };
    }

    if (month < 1 || month > 12) {
      return { valid: false, message: 'Mois invalide (1-12)' };
    }

    if (day < 1 || day > 31) {
      return { valid: false, message: 'Jour invalide (1-31)' };
    }

    if (year < 1900 || year > 2100) {
      return { valid: false, message: 'Année invalide (1900-2100)' };
    }

    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeapYear) {
      daysInMonth[1] = 29;
    }

    if (day > daysInMonth[month - 1]) {
      return { valid: false, message: `Ce mois n'a que ${daysInMonth[month - 1]} jours` };
    }

    return { valid: true, message: '' };
  };

  /**
   * Valide l'heure entrée
   */
  const validateTime = (timeStr) => {
    if (!timeStr || timeStr.length < 5) {
      return { valid: true, message: '' };
    }

    const parts = timeStr.split(':');
    if (parts.length !== 2) {
      return { valid: false, message: 'Format invalide (HH:MM)' };
    }

    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);

    if (isNaN(hours) || isNaN(minutes)) {
      return { valid: false, message: 'Heure invalide' };
    }

    if (hours < 0 || hours > 23) {
      return { valid: false, message: 'Heures invalides (0-23)' };
    }

    if (minutes < 0 || minutes > 59) {
      return { valid: false, message: 'Minutes invalides (0-59)' };
    }

    return { valid: true, message: '' };
  };

  const dateValidation = useMemo(() => validateDate(dateValue), [dateValue]);
  const timeValidation = useMemo(() => validateTime(timeValue), [timeValue]);

  const handleDateChange = (text) => {
    if (Platform.OS === 'web') {
      // Conversion depuis le format HTML5
      const formatted = convertFromHtml5Date(text);
      onDateChange(formatted);
    } else {
      const formatted = formatDateInput(text);
      onDateChange(formatted);
    }
  };

  const handleTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    onTimeChange(formatted);
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.mainContainer, containerStyle]}>
        <View style={styles.webRow}>
          <View style={styles.webInputWrapper}>
            <AppText variant="labelMedium" style={styles.webLabel}>
              {dateLabel}
            </AppText>
            <input
              type="date"
              value={convertToHtml5Date(dateValue)}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: `1px solid ${!dateValidation.valid ? '#C0392B' : '#E2E8F0'}`,
                borderRadius: '12px',
                backgroundColor: '#F5EFE8',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            {!dateValidation.valid && (
              <AppText variant="labelSmall" style={styles.webError}>
                {dateValidation.message}
              </AppText>
            )}
          </View>

          {(timeValue !== undefined || onTimeChange) && (
            <View style={styles.webInputWrapper}>
              <AppText variant="labelMedium" style={styles.webLabel}>
                {timeLabel}
              </AppText>
              <input
                type="time"
                value={timeValue || ''}
                onChange={(e) => handleTimeChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: `1px solid ${!timeValidation.valid ? '#C0392B' : '#E2E8F0'}`,
                  borderRadius: '12px',
                  backgroundColor: '#F5EFE8',
                  fontFamily: 'inherit',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              {!timeValidation.valid && (
                <AppText variant="labelSmall" style={styles.webError}>
                  {timeValidation.message}
                </AppText>
              )}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Version mobile (React Native Paper TextInput)
  return (
    <View style={[styles.mainContainer, containerStyle]}>
      <View style={[styles.inputsRow, !timeValue && !onTimeChange && styles.inputsRowSingle]}>
        <View style={styles.inputWrapper}>
          <TextInput
            label={dateLabel}
            value={dateValue}
            onChangeText={handleDateChange}
            style={[styles.input, timeValue || onTimeChange ? styles.dateInput : styles.dateInputFull]}
            mode="outlined"
            outlineStyle={styles.outline}
            keyboardType="numeric"
            placeholder="JJ/MM/AAAA"
            error={!dateValidation.valid}
          />
          <HelperText type="error" visible={!dateValidation.valid} style={styles.helperText}>
            {dateValidation.message}
          </HelperText>
        </View>

        {(timeValue !== undefined || onTimeChange) && (
          <View style={styles.inputWrapper}>
            <TextInput
              label={timeLabel}
              value={timeValue}
              onChangeText={handleTimeChange}
              style={[styles.input, styles.timeInput]}
              mode="outlined"
              outlineStyle={styles.outline}
              keyboardType="numeric"
              placeholder="HH:MM"
              error={!timeValidation.valid}
            />
            <HelperText type="error" visible={!timeValidation.valid} style={styles.helperText}>
              {timeValidation.message}
            </HelperText>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    marginBottom: designSystem.spacing[2],
  },
  // Styles web
  webRow: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
  },
  webInputWrapper: {
    width: '100%',
  },
  webLabel: {
    marginBottom: designSystem.spacing[1],
    color: designSystem.colors.text.secondary,
    fontWeight: '600',
  },
  webError: {
    color: '#C0392B',
    marginTop: designSystem.spacing[1],
  },
  // Styles mobile
  inputsRow: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
  },
  inputsRowSingle: {
    flexDirection: 'column',
  },
  inputWrapper: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F5EFE8',
  },
  dateInput: {
    marginRight: 0,
  },
  dateInputFull: {
    marginRight: 0,
  },
  timeInput: {
    marginLeft: 0,
  },
  outline: {
    borderRadius: designSystem.borderRadius.lg,
  },
  helperText: {
    fontSize: 12,
    paddingHorizontal: 4,
    marginTop: -4,
  },
});

export default DateTimePicker;
