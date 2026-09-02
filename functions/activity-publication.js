// Keep the generated-activity publisher and the manual Admin import on the
// same business date, independent of the timezone of the client or server.
export function activityPublicationMetadata(sourceWeek = '', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  return {
    week: `${value('day')} DE ${months[Number(value('month')) - 1]} ${value('year')}`,
    publicationDate: `${value('year')}-${value('month')}-${value('day')}`,
    sourceWeek: typeof sourceWeek === 'string' ? sourceWeek : '',
  };
}
