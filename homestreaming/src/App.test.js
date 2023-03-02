import { render, screen } from '@testing-library/react'
import { HomestreamingApp } from './App'

test('renders learn react link', () => {
  render(<HomestreamingApp />)
  const linkElement = screen.getByText(/learn react/i)
  expect(linkElement).toBeInTheDocument()
})
