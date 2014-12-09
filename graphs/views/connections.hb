{{#each connections}}
    <div>
      <div>{{this.source.id}} {{this.source.port}}</div>
      <div> -> </div>
      <div>{{this.target.port}} {{this.target.id}}</div>
      <div>fills: {{this.fills}}</div>
      <div>rejects: {{this.rejects}}</div>
      <div>writes: {{this.writes}}</div>
    </div>
{{/each}}
