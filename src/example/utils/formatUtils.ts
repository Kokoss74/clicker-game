import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

/**
 * Форматирует дату в локализованный формат
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return format(date, 'dd.MM.yyyy HH:mm', { locale: ru })
}

/**
 * Форматирует номер телефона для отображения
 */
export const formatPhoneNumber = (phone: string): string => {
  // Предполагаем формат +972XXXXXXXXX
  if (!phone || phone.length !== 13) return phone
  
  const countryCode = phone.slice(0, 4) // +972
  const areaCode = phone.slice(4, 6)    // XX
  const firstPart = phone.slice(6, 9)   // XXX
  const secondPart = phone.slice(9)     // XXXX
  
  return `${countryCode} (${areaCode}) ${firstPart}-${secondPart}`
}

/**
 * Форматирует скидку для отображения
 */
export const formatDiscount = (discount: number): string => {
  return `${discount}%`
}