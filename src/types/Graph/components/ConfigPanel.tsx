import React from 'react';
import { GraphConfig } from '../type';

const evaluationOptions = [
	'isomorphism',
	'connectivity',
	'bipartite',
	'cycle_detection',
	'graph_coloring',
	'planarity',
	'tree',
	'forest',
	'dag',
	'eulerian',
	'semi_eulerian',
	'regular',
	'complete',
	'degree_sequence',
	'subgraph',
	'hamiltonian_path',
	'hamiltonian_cycle',
	'clique_number'
];

interface ConfigPanelProps {
	config: GraphConfig;
	onChange: (config: GraphConfig) => void;
	AnswerPanel?: React.ReactNode;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, AnswerPanel }) => {
	const [selectedType, setSelectedType] = React.useState<string>(config.evaluation_type ?? '')
	const [directed, setDirected] = React.useState<boolean>(config.directed ?? false)

	const updateConfig = (updates: Partial<GraphConfig>) => {
		onChange({ ...config, ...updates });
	};

	const handleTypeChange = (type: string) => {
		setSelectedType(type);
		updateConfig({ evaluation_type: type });
	};

	const handleDirectedToggle = (val: boolean) => {
		setDirected(val);
		updateConfig({ directed: val });
	};

	const radioStyle = (active: boolean): React.CSSProperties => ({
		display: 'flex',
		alignItems: 'center',
		padding: '10px 20px',
		cursor: 'pointer',
		border: active ? '2px solid #0057b8' : '1px solid #d9d9d9',
		background: active ? '#cce6ff' : '#fff',
		borderRadius: '8px',
		fontWeight: active ? 700 : 400,
		color: active ? '#0057b8' : '#333',
		transition: 'all 0.2s',
	});

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: 400 }}>

			{/* ---- Directed / Undirected toggle ---- */}
			<div>
				<h3 style={{ marginBottom: 8, fontWeight: 600, fontSize: 18 }}>Graph Type</h3>
				<div style={{ display: 'flex', gap: '12px' }}>
					{([false, true] as const).map(val => (
						<label key={String(val)} style={radioStyle(directed === val)}>
							<input
								type="radio"
								name="graph-directed"
								value={String(val)}
								checked={directed === val}
								onChange={() => handleDirectedToggle(val)}
								style={{ accentColor: '#0057b8', marginRight: 10 }}
							/>
							{val ? 'Directed' : 'Undirected'}
						</label>
					))}
				</div>
			</div>

			{/* ---- Evaluation type selector ---- */}
			<div>
				<h3 style={{ marginBottom: 8, fontWeight: 600, fontSize: 18 }}>Evaluation Type</h3>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
					{evaluationOptions.map(type => (
						<label
							key={type}
							style={{
								...radioStyle(selectedType === type),
								boxShadow: selectedType === type ? '0 0 8px #0057b833' : 'none',
							}}
						>
							<input
								type="radio"
								name="graph-evaluation-type"
								value={type}
								checked={selectedType === type}
								onChange={() => handleTypeChange(type)}
								style={{ accentColor: '#0057b8', marginRight: 16 }}
							/>
							<span style={{ fontSize: 15 }}>{type.replace(/_/g, ' ')}</span>
						</label>
					))}
				</div>
			</div>

			{selectedType === 'isomorphism' && AnswerPanel}

		</div>
	);
};
