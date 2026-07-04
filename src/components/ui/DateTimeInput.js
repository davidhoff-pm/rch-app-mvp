import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText } from 'react-native-paper';

/**
 * Composant réutilisable pour la saisie de date et heure
 * Formate automatiquement avec / et :
 * Valide en temps réel et affiche les erreurs
 */
const DateTimeInput = ({ 
  dateValue, 
  timeValue, 
  onDateChange, 
  onTimeChange,
  dateLabel = "Date (JJ/MM/AAAA)",
  timeLabel = "Heure (HH:MM)",
  containerStyle 
}) => {
  
  /**
   * Formate l'entrée de date avec des /
   * Ex: 13102025 → 13/10/2025
   */
  const formatDateInput = (text) => {
    // Supprimer tout sauf les chiffres
    const numbers = text.replace(/\D/g, '');
    
    // Limiter à 8 chiffres (DDMMYYYY)
    const limited = numbers.slice(0, 8);
    
    // Formater avec les /
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
    // Supprimer tout sauf les chiffres
    const numbers = text.replace(/\D/g, '');
    
    // Limiter à 4 chiffres (HHMM)
    const limited = numbers.slice(0, 4);
    
    // Formater avec le :
    if (limited.length <= 2) {
      return limited;
    } else {
      return `${limited.slice(0, 2)}:${limited.slice(2)}`;
    }
  };

  /**
   * Valide la date entrée
   * Vérifie le format et la validité de la date
   */
  const validateDate = (dateStr) => {
    // Si vide ou incomplet, pas d'erreur encore
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
    
    // Vérifier que ce sont des nombres valides
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return { valid: false, message: 'Date invalide' };
    }
    
    // Vérifier les plages
    if (month < 1 || month > 12) {
      return { valid: false, message: 'Mois invalide (1-12)' };
    }
    
    if (day < 1 || day > 31) {
      return { valid: false, message: 'Jour invalide (1-31)' };
    }
    
    if (year < 1900 || year > 2100) {
      return { valid: false, message: 'Année invalide (1900-2100)' };
    }
    
    // Vérifier les jours par mois
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Année bissextile
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
   * Vérifie le format et la validité de l'heure
   */
  const validateTime = (timeStr) => {
    // Si vide ou incomplet, pas d'erreur encore
    if (!timeStr || timeStr.length < 5) {
      return { valid: true, message: '' };
    }

    const parts = timeStr.split(':');
    if (parts.length !== 2) {
      return { valid: false, message: 'Format invalide (HH:MM)' };
    }
    
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    
    // Vérifier que ce sont des nombres valides
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

  // Validation en temps réel
  const dateValidation = useMemo(() => validateDate(dateValue), [dateValue]);
  const timeValidation = useMemo(() => validateTime(timeValue), [timeValue]);

  const handleDateChange = (text) => {
    const formatted = formatDateInput(text);
    onDateChange(formatted);
  };

  const handleTimeChange = (text) => {
    const formatted = formatTimeInput(text);
    onTimeChange(formatted);
  };

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
    marginBottom: 8,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputsRowSingle: {
    flexDirection: 'column',
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    backgroundColor: '#F5EFE8',
  },
  dateInput: {
    marginRight: 8,
  },
  dateInputFull: {
    marginRight: 0,
  },
  timeInput: {
    marginLeft: 8,
  },
  outline: {
    borderRadius: 16,
  },
  helperText: {
    fontSize: 12,
    paddingHorizontal: 4,
    marginTop: -4,
  },
});

/**
 * Fonction utilitaire pour valider une date depuis un composant parent
 * @param {string} dateStr - Date au format JJ/MM/AAAA
 * @returns {boolean} - true si valide, false sinon
 */
export const isValidDate = (dateStr) => {
  if (!dateStr || dateStr.length < 10) {
    return false;
  }

  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  const year = parseInt(parts[2]);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;
  
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeapYear) daysInMonth[1] = 29;
  
  if (day > daysInMonth[month - 1]) return false;
  
  return true;
};

/**
 * Fonction utilitaire pour valider une heure depuis un composant parent
 * @param {string} timeStr - Heure au format HH:MM
 * @returns {boolean} - true si valide, false sinon
 */
export const isValidTime = (timeStr) => {
  if (!timeStr || timeStr.length < 5) {
    return false;
  }

  const parts = timeStr.split(':');
  if (parts.length !== 2) return false;
  
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  
  if (isNaN(hours) || isNaN(minutes)) return false;
  if (hours < 0 || hours > 23) return false;
  if (minutes < 0 || minutes > 59) return false;
  
  return true;
};

export default DateTimeInput;

