import { DIFFICULTIES } from '../../src/engine/difficulty';
import { Game } from '../../src/engine/game';
import { mulberry32 } from '../../src/engine/rng';

const SEED = 4242;
const CENTRE = 40;
const cells = () => cy.get('#board .cell');

// A mine under SEED once the first click lands on the centre cell.
function knownMine(): number {
  const g = new Game(DIFFICULTIES.beginner, mulberry32(SEED));
  g.reveal(CENTRE);
  return g.cells.findIndex((c) => c.mine);
}

describe('minesweeper', () => {
  it('renders a covered beginner board', () => {
    cy.visit('/');
    cells().should('have.length', 81);
    cy.get('#mine-counter').should('have.text', '010');
    cy.get('#timer').should('have.text', '000');
    cy.get('#reset').should('have.attr', 'data-face', 'smile');
  });

  it('first click is safe and floods', () => {
    cy.visit(`/?seed=${SEED}`);
    cy.get(`.cell[data-index="${CENTRE}"]`).click();
    cy.get('#reset').should('have.attr', 'data-face', 'smile');
    cy.get('#board .cell.revealed').should('have.length.greaterThan', 1);
  });

  it('right click flags without a context menu', () => {
    cy.visit('/');
    cy.get('.cell[data-index="0"]').rightclick();
    cy.get('.cell[data-index="0"]').should('have.class', 'flagged');
    cy.get('#mine-counter').should('have.text', '009');
    cy.get('#board').then(($b) => {
      const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      $b[0]?.dispatchEvent(e);
      expect(e.defaultPrevented).to.equal(true);
    });
  });

  it('timer runs after the first move', () => {
    cy.visit(`/?seed=${SEED}`);
    cy.get(`.cell[data-index="${CENTRE}"]`).click();
    cy.wait(2200);
    cy.get('#timer').should('not.have.text', '000');
  });

  it('clicking a mine loses and shows every mine', () => {
    cy.visit(`/?seed=${SEED}`);
    cy.get(`.cell[data-index="${CENTRE}"]`).click();
    const mine = knownMine();
    cy.get(`.cell[data-index="${mine}"]`).click();
    cy.get('#reset').should('have.attr', 'data-face', 'dead');
    cy.get(`.cell[data-index="${mine}"]`).should('have.class', 'exploded');
    cy.get('#board .cell.mine, #board .cell.exploded').should('have.length', 10);
  });

  it('reset restores a covered board', () => {
    cy.visit(`/?seed=${SEED}`);
    cy.get(`.cell[data-index="${CENTRE}"]`).click();
    cy.get('#reset').click();
    cells().should('have.length', 81);
    cy.get('#board .cell.revealed').should('have.length', 0);
    cy.get('#reset').should('have.attr', 'data-face', 'smile');
  });

  it('expert renders 480 cells in 30 columns', () => {
    cy.visit('/');
    cy.get('#difficulty').select('expert');
    cells().should('have.length', 480);
    cy.get('#board')
      .should('have.css', 'grid-template-columns')
      .then((v) => {
        expect(String(v).trim().split(/\s+/)).to.have.length(30);
      });
  });

  [
    [1280, 800],
    [1920, 1080],
  ].forEach(([w, h]) => {
    it(`expert fits ${w}x${h} without scrollbars`, () => {
      cy.viewport(w as number, h as number);
      cy.visit('/?level=expert');
      cells().should('have.length', 480);
      cy.document().then((doc) => {
        const el = doc.documentElement;
        expect(el.scrollWidth).to.be.at.most(el.clientWidth);
        expect(el.scrollHeight).to.be.at.most(el.clientHeight);
      });
      cy.get('#board').then(($b) => {
        const r = $b[0]?.getBoundingClientRect();
        expect(r?.right).to.be.at.most(w as number);
        expect(r?.bottom).to.be.at.most(h as number);
      });
    });
  });
});
