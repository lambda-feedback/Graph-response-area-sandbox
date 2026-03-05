import { makeStyles } from '@styles'

export const useConfigPanelStyles = makeStyles()(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: 400,
  },

  sectionHeading: {
    marginBottom: 8,
    fontWeight: 600,
    fontSize: 18,
  },

  radioGroupRow: {
    display: 'flex',
    gap: '12px',
  },

  radioGroupColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    cursor: 'pointer',
    border: '1px solid #d9d9d9',
    background: '#fff',
    borderRadius: '8px',
    fontWeight: 400,
    color: '#333',
    transition: 'all 0.2s',
    boxShadow: 'none',
  },

  radioLabelActive: {
    border: '2px solid #0057b8',
    background: '#cce6ff',
    fontWeight: 700,
    color: '#0057b8',
    boxShadow: '0 0 8px #0057b833',
  },

  radioInput: {
    accentColor: '#0057b8',
    marginRight: 10,
  },

  radioInputWide: {
    accentColor: '#0057b8',
    marginRight: 16,
  },

  radioOptionText: {
    fontSize: 15,
  },
}))
