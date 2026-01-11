/**
 * Tableau des pièces pour le PDF Plan de Découpe
 */

import { View, Text } from '@react-pdf/renderer';
import { styles } from '../styles/pdf-styles';
import type { DebitPlace } from '../types';

interface PdfPiecesTableProps {
  pieces: DebitPlace[];
}

export function PdfPiecesTable({ pieces }: PdfPiecesTableProps) {
  const columns = [
    { key: 'ref', label: 'Réf', width: '20%' },
    { key: 'longueur', label: 'L (mm)', width: '20%' },
    { key: 'largeur', label: 'l (mm)', width: '20%' },
    { key: 'chants', label: 'Chants', width: '40%' },
  ];

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={{
              ...styles.tableCellBold,
              width: col.width,
            }}
          >
            {col.label}
          </Text>
        ))}
      </View>
      {pieces.map((piece: DebitPlace, index: number) => (
        <View
          key={piece.id || index}
          style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
        >
          <Text style={{ ...styles.tableCell, width: columns[0].width }}>
            {piece.reference || `P${index + 1}`}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: columns[1].width }}>
            {piece.longueur}
          </Text>
          <Text style={{ ...styles.tableCellRight, width: columns[2].width }}>
            {piece.largeur}
          </Text>
          <Text style={{ ...styles.tableCell, width: columns[3].width }}>
            {formatChants(piece)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function formatChants(piece: DebitPlace): string {
  const chants: string[] = [];
  if (piece.chants?.A) chants.push('A');
  if (piece.chants?.B) chants.push('B');
  if (piece.chants?.C) chants.push('C');
  if (piece.chants?.D) chants.push('D');
  return chants.length > 0 ? chants.join(', ') : '-';
}
